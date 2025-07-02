import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { PlusCircle, XCircle, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const TaskReportModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [tasks, setTasks] = useState(['']);

  useEffect(() => {
    if (isOpen) {
      setTasks(['']); // Reset to one empty task when modal opens
      setError(''); // Clear any previous errors
    }
  }, [isOpen]);

  const handleTaskChange = (index, value) => {
    const newTasks = [...tasks];
    newTasks[index] = value;
    setTasks(newTasks);
  };

  const handleAddTask = () => {
    setTasks([...tasks, '']);
  };

  const handleRemoveTask = (index) => {
    if (tasks.length > 1) {
      const newTasks = tasks.filter((_, i) => i !== index);
      setTasks(newTasks);
    }
  };

  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const nonEmptyTasks = tasks.map(t => t.trim()).filter(t => t !== '');
    if (nonEmptyTasks.length > 0) {
      setError('');
      onSubmit(nonEmptyTasks);
    } else {
      setError('Please enter at least one task to continue.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg mx-auto transform transition-all duration-300 animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Today's Work Report</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              List your completed tasks before checking out
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        
        {/* Form Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tasks List */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Clock className="h-4 w-4" />
                <span>Today's accomplishments</span>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {tasks.map((task, index) => (
                  <div key={index} className="group">
                    <div className="flex items-start gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-slate-300 dark:hover:border-slate-500 transition-colors focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20">
                      <div className="mt-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                      <textarea
                        placeholder={`Describe your task #${index + 1}...`}
                        value={task}
                        onChange={(e) => handleTaskChange(index, e.target.value)}
                        className="flex-1 bg-transparent border-0 outline-none resize-none min-h-[20px] placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100"
                        rows="1"
                        style={{ 
                          height: 'auto',
                          minHeight: '20px'
                        }}
                        onInput={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        required
                      />
                      {tasks.length > 1 && (
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

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Footer */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="sm:order-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="sm:order-2 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Checking Out...
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