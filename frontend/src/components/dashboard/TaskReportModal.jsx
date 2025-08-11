import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { PlusCircle, XCircle, FileText, Clock, CheckCircle, AlertCircle, Save, ArrowRight, Coffee, Sunset } from 'lucide-react';

const TaskReportModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [currentStep, setCurrentStep] = useState(1); // 1 = pre-lunch, 2 = post-lunch
  const [preLunchTasks, setPreLunchTasks] = useState(['']);
  const [postLunchTasks, setPostLunchTasks] = useState(['']);
  const [error, setError] = useState('');
  const [savedPreLunch, setSavedPreLunch] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const modalRef = useRef(null);
  const backdropRef = useRef(null);

  const STORAGE_KEY = 'taskReport_preLunch';

  // Detect mobile device and keyboard state
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Handle keyboard open/close on mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleResize = () => {
      const heightDiff = window.screen.height - window.innerHeight;
      setIsKeyboardOpen(heightDiff > 150); // Threshold for keyboard detection
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  useEffect(() => {
    if (isOpen) {
      // Load saved pre-lunch tasks if available
      const savedTasks = localStorage.getItem(STORAGE_KEY);
      if (savedTasks) {
        try {
          const parsedTasks = JSON.parse(savedTasks);
          setPreLunchTasks(parsedTasks.length > 0 ? parsedTasks : ['']);
          setSavedPreLunch(true);
        } catch (e) {
          setPreLunchTasks(['']);
          setSavedPreLunch(false);
        }
      } else {
        setPreLunchTasks(['']);
        setSavedPreLunch(false);
      }
      
      setPostLunchTasks(['']);
      setCurrentStep(1);
      setError('');
      
      // Prevent body scroll on mobile
      if (isMobile) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);

  const getCurrentTasks = () => currentStep === 1 ? preLunchTasks : postLunchTasks;
  const setCurrentTasks = currentStep === 1 ? setPreLunchTasks : setPostLunchTasks;

  const handleTaskChange = (index, value) => {
    const newTasks = [...getCurrentTasks()];
    newTasks[index] = value;
    setCurrentTasks(newTasks);
  };

  // Handle backdrop click - only close if not on mobile or if specifically clicking backdrop
  const handleBackdropClick = useCallback((e) => {
    if (e.target === backdropRef.current) {
      // On mobile, require a deliberate backdrop click (not just any outside click)
      if (!isMobile || !isKeyboardOpen) {
        onClose();
      }
    }
  }, [isMobile, isKeyboardOpen, onClose]);

  const handleAddTask = () => {
    setCurrentTasks([...getCurrentTasks(), '']);
  };

  const handleRemoveTask = (index) => {
    const currentTasks = getCurrentTasks();
    if (currentTasks.length > 1) {
      const newTasks = currentTasks.filter((_, i) => i !== index);
      setCurrentTasks(newTasks);
    }
  };

  const savePreLunchTasks = () => {
    const nonEmptyTasks = preLunchTasks.map(t => t.trim()).filter(t => t !== '');
    if (nonEmptyTasks.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nonEmptyTasks));
      setSavedPreLunch(true);
      setError('');
      // Show success message briefly
      const originalError = error;
      setError('Pre-lunch tasks saved successfully!');
      setTimeout(() => setError(originalError), 2000);
    } else {
      setError('Please enter at least one pre-lunch task to save.');
    }
  };

  const goToPostLunch = () => {
    const nonEmptyTasks = preLunchTasks.map(t => t.trim()).filter(t => t !== '');
    if (nonEmptyTasks.length > 0) {
      setError('');
      setCurrentStep(2);
    } else {
      setError('Please enter at least one pre-lunch task before proceeding.');
    }
  };

  const goBackToPreLunch = () => {
    setCurrentStep(1);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (currentStep === 1) {
      goToPostLunch();
      return;
    }

    // Final submission for checkout
    const preLunchNonEmpty = preLunchTasks.map(t => t.trim()).filter(t => t !== '');
    const postLunchNonEmpty = postLunchTasks.map(t => t.trim()).filter(t => t !== '');
    
    if (preLunchNonEmpty.length === 0) {
      setError('Please enter at least one pre-lunch task.');
      setCurrentStep(1);
      return;
    }
    
    if (postLunchNonEmpty.length === 0) {
      setError('Please enter at least one post-lunch task.');
      return;
    }

    // Combine all tasks with labels
    const allTasks = [
      ...preLunchNonEmpty.map(task => `[Pre-lunch] ${task}`),
      ...postLunchNonEmpty.map(task => `[Post-lunch] ${task}`)
    ];

    setError('');
    // Clear saved pre-lunch tasks after successful submission
    localStorage.removeItem(STORAGE_KEY);
    onSubmit(allTasks);
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={backdropRef}
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center p-4 ${
        isMobile && isKeyboardOpen ? 'items-start pt-4' : 'items-center'
      }`}
      onClick={handleBackdropClick}
      style={{
        paddingTop: isMobile && isKeyboardOpen ? '1rem' : undefined
      }}
    >
      <div 
        ref={modalRef}
        className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full mx-auto transform transition-all duration-300 ${
          isMobile 
            ? `max-w-full ${isKeyboardOpen ? 'max-h-[90vh] overflow-y-auto' : 'max-w-lg animate-in slide-in-from-bottom-4'}` 
            : 'max-w-lg animate-in slide-in-from-bottom-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${currentStep === 1 ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
              {currentStep === 1 ? (
                <Coffee className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              ) : (
                <Sunset className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {currentStep === 1 ? 'Pre-Lunch Tasks' : 'Post-Lunch Tasks'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {currentStep === 1 
                  ? 'Document your morning accomplishments' 
                  : 'Record your afternoon tasks and activities'
                }
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              currentStep === 1 
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' 
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            }`}>
              <Coffee className="h-3 w-3" />
              Pre-Lunch
              {savedPreLunch && <CheckCircle className="h-3 w-3" />}
            </div>
            <div className={`w-8 h-px ${currentStep === 2 ? 'bg-blue-400' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              currentStep === 2 
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            }`}>
              <Sunset className="h-3 w-3" />
              Post-Lunch
            </div>
          </div>
        </div>
        
        {/* Form Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tasks List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Clock className="h-4 w-4" />
                  <span>{currentStep === 1 ? 'Morning tasks completed' : 'Afternoon accomplishments'}</span>
                </div>
                {currentStep === 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={savePreLunchTasks}
                    className="text-xs"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Save for Later
                  </Button>
                )}
              </div>
              
              <div className={`space-y-3 pr-2 ${
                isMobile && isKeyboardOpen 
                  ? 'max-h-40 overflow-y-auto' 
                  : 'max-h-64 overflow-y-auto'
              }`}>
                {getCurrentTasks().map((task, index) => (
                  <div key={index} className="group">
                    <div className="flex items-start gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-slate-300 dark:hover:border-slate-500 transition-colors focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20">
                      <div className="mt-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                      <textarea
                        placeholder={`${currentStep === 1 ? 'Morning' : 'Afternoon'} task #${index + 1}...`}
                        value={task}
                        onChange={(e) => handleTaskChange(index, e.target.value)}
                        className="flex-1 bg-transparent border-0 outline-none resize-none min-h-[20px] placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100"
                        rows={isMobile ? "2" : "1"}
                        style={{ 
                          height: isMobile ? 'auto' : 'auto',
                          minHeight: isMobile ? '40px' : '20px',
                          maxHeight: isMobile && isKeyboardOpen ? '80px' : 'auto'
                        }}
                        onInput={(e) => {
                          if (!isMobile || !isKeyboardOpen) {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }
                        }}
                        onTouchStart={(e) => {
                          // Prevent accidental backdrop clicks while typing on mobile
                          e.stopPropagation();
                        }}
                        required
                      />
                      {getCurrentTasks().length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveTask(index)} 
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all mt-0.5"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleAddTask} 
                className="w-full border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Another Task
              </Button>
            </div>

            {/* Error/Success Message */}
            {error && (
              <div className={`flex items-center gap-2 p-3 border rounded-lg ${
                error.includes('successfully') 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                {error.includes('successfully') ? (
                  <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
                )}
                <p className={`text-sm ${
                  error.includes('successfully') 
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {error}
                </p>
              </div>
            )}

            {/* Footer */}
            <div className={`flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700 ${
              isMobile ? 'flex-col' : 'flex-col sm:flex-row'
            }`}>
              {currentStep === 2 && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={goBackToPreLunch}
                  disabled={isLoading}
                  className="sm:order-1"
                >
                  <ArrowRight className="h-4 w-4 rotate-180 mr-2" />
                  Back to Pre-Lunch
                </Button>
              )}
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className={currentStep === 2 ? "sm:order-2" : "sm:order-1"}
                disabled={isLoading}
              >
                Cancel
              </Button>
              
              <Button 
                type="submit" 
                disabled={isLoading}
                className={`${currentStep === 2 ? "sm:order-3" : "sm:order-2"} ${
                  currentStep === 1 
                    ? 'bg-orange-600 hover:bg-orange-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white flex items-center gap-2`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Checking Out...
                  </>
                ) : currentStep === 1 ? (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    Continue to Post-Lunch
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Submit & Check Out
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TaskReportModal; 