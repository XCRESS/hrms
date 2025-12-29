import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { PlusCircle, XCircle, Clock, CheckCircle, AlertCircle, Coffee, Sunset, User, Calendar, Timer } from 'lucide-react';
import useAuth from '../../hooks/authjwt';
import apiClient from '../../service/apiClient';

const TaskReportModal = ({ isOpen, onClose, onSubmit, onSkip, isLoading, isOptional = false }) => {
  const [tasks, setTasks] = useState(['']);
  const [preLunchTasks, setPreLunchTasks] = useState(['']);
  const [postLunchTasks, setPostLunchTasks] = useState(['']);
  const [error, setError] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [workDuration, setWorkDuration] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [attendanceSettings, setAttendanceSettings] = useState(null);
  
  const modalRef = useRef(null);
  const user = useAuth();

  // Mobile detection
  useEffect(() => {
    const checkDevice = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Enhanced keyboard detection
  useEffect(() => {
    if (!isMobile) return;

    const initialHeight = window.innerHeight;
    let keyboardTimeout;

    const handleResize = () => {
      clearTimeout(keyboardTimeout);
      keyboardTimeout = setTimeout(() => {
        const currentHeight = window.innerHeight;
        const heightDifference = initialHeight - currentHeight;
        setIsKeyboardVisible(heightDifference > 150);
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(keyboardTimeout);
    };
  }, [isMobile]);

  // Fetch settings and attendance data
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen || !user?.employeeId) return;

      try {
        // Fetch attendance settings
        const settingsResponse = await apiClient.getGlobalSettings();
        const settings = settingsResponse?.data?.attendance || {};
        setAttendanceSettings(settings);

        // Fetch today's attendance
        const today = new Date().toISOString().slice(0, 10);
        const attendanceResponse = await apiClient.getMyAttendanceRecords({
          startDate: today,
          endDate: today,
          limit: 1,
        });

        if (attendanceResponse.success && attendanceResponse.data?.records?.length > 0) {
          const record = attendanceResponse.data.records[0];
          if (record.checkIn) {
            const checkInDateTime = new Date(record.checkIn);
            setCheckInTime(checkInDateTime);
            
            const now = new Date();
            const workHours = (now - checkInDateTime) / (1000 * 60 * 60);
            const minimumWorkHours = settings.minimumWorkHours || 4;
            
            setIsHalfDay(workHours < minimumWorkHours);
            setWorkDuration(formatWorkDuration(workHours));
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [isOpen, user?.employeeId]);

  // Update time every minute
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      if (checkInTime && attendanceSettings) {
        const workHours = (now - checkInTime) / (1000 * 60 * 60);
        setWorkDuration(formatWorkDuration(workHours));
        
        const minimumWorkHours = attendanceSettings.minimumWorkHours || 4;
        setIsHalfDay(workHours < minimumWorkHours);
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [isOpen, checkInTime, attendanceSettings]);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      setError('');
      
      // Load saved draft first, then set defaults if nothing saved
      const savedTasks = localStorage.getItem('taskReport_draft');
      if (savedTasks) {
        try {
          const parsed = JSON.parse(savedTasks);
          if (parsed && Object.keys(parsed).length > 0) {
            // Check if it's structured data with pre/post lunch sections
            if (parsed.preLunchTasks && parsed.postLunchTasks) {
              setPreLunchTasks(parsed.preLunchTasks.length > 0 ? parsed.preLunchTasks : ['']);
              setPostLunchTasks(parsed.postLunchTasks.length > 0 ? parsed.postLunchTasks : ['']);
              setTasks(['']); // Set default for half-day mode
            } else if (Array.isArray(parsed) && parsed.length > 0) {
              // Legacy format - just tasks array
              setTasks(parsed);
              setPreLunchTasks(['']); // Set defaults for full-day mode
              setPostLunchTasks(['']);
            } else {
              // Empty or invalid data, set defaults
              setTasks(['']);
              setPreLunchTasks(['']);
              setPostLunchTasks(['']);
            }
          } else {
            // No valid saved data, set defaults
            setTasks(['']);
            setPreLunchTasks(['']);
            setPostLunchTasks(['']);
          }
        } catch {
          // Error parsing, set defaults
          setTasks(['']);
          setPreLunchTasks(['']);
          setPostLunchTasks(['']);
        }
      } else {
        // No saved data, set defaults
        setTasks(['']);
        setPreLunchTasks(['']);
        setPostLunchTasks(['']);
      }

      // Prevent background scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Auto-save tasks
  useEffect(() => {
    if (isHalfDay) {
      const nonEmptyTasks = tasks.filter(task => task.trim());
      if (nonEmptyTasks.length > 0) {
        localStorage.setItem('taskReport_draft', JSON.stringify(nonEmptyTasks));
      }
    } else {
      const nonEmptyPreLunchTasks = preLunchTasks.filter(task => task.trim());
      const nonEmptyPostLunchTasks = postLunchTasks.filter(task => task.trim());
      if (nonEmptyPreLunchTasks.length > 0 || nonEmptyPostLunchTasks.length > 0) {
        localStorage.setItem('taskReport_draft', JSON.stringify({
          preLunchTasks: nonEmptyPreLunchTasks,
          postLunchTasks: nonEmptyPostLunchTasks
        }));
      }
    }
  }, [tasks, preLunchTasks, postLunchTasks, isHalfDay]);

  const formatWorkDuration = (hours) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatTime = (date) => {
    return date ? date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    }) : '';
  };

  const handleTaskChange = (index, value) => {
    const newTasks = [...tasks];
    newTasks[index] = value;
    setTasks(newTasks);
  };

  const handlePreLunchTaskChange = (index, value) => {
    const newTasks = [...preLunchTasks];
    newTasks[index] = value;
    setPreLunchTasks(newTasks);
  };

  const handlePostLunchTaskChange = (index, value) => {
    const newTasks = [...postLunchTasks];
    newTasks[index] = value;
    setPostLunchTasks(newTasks);
  };

  const handleAddTask = () => {
    setTasks([...tasks, '']);
  };

  const handleAddPreLunchTask = () => {
    setPreLunchTasks([...preLunchTasks, '']);
  };

  const handleAddPostLunchTask = () => {
    setPostLunchTasks([...postLunchTasks, '']);
  };

  const handleRemoveTask = (index) => {
    if (tasks.length > 1) {
      const newTasks = tasks.filter((_, i) => i !== index);
      setTasks(newTasks);
    }
  };

  const handleRemovePreLunchTask = (index) => {
    if (preLunchTasks.length > 1) {
      const newTasks = preLunchTasks.filter((_, i) => i !== index);
      setPreLunchTasks(newTasks);
    }
  };

  const handleRemovePostLunchTask = (index) => {
    if (postLunchTasks.length > 1) {
      const newTasks = postLunchTasks.filter((_, i) => i !== index);
      setPostLunchTasks(newTasks);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let nonEmptyTasks;
    
    if (isHalfDay) {
      nonEmptyTasks = tasks.map(t => t.trim()).filter(t => t !== '');
    } else {
      // For full-day checkouts, combine pre and post lunch tasks
      const preLunchTasksClean = preLunchTasks.map(t => t.trim()).filter(t => t !== '');
      const postLunchTasksClean = postLunchTasks.map(t => t.trim()).filter(t => t !== '');
      
      // Combine with section labels for clarity
      const preLunchWithLabels = preLunchTasksClean.length > 0 
        ? preLunchTasksClean.map(task => `[Pre-lunch] ${task}`) 
        : [];
      const postLunchWithLabels = postLunchTasksClean.length > 0 
        ? postLunchTasksClean.map(task => `[Post-lunch] ${task}`) 
        : [];
      
      nonEmptyTasks = [...preLunchWithLabels, ...postLunchWithLabels];
    }
    
    if (nonEmptyTasks.length === 0) {
      setError(isHalfDay 
        ? 'Please add at least one task to continue.' 
        : 'Please add at least one task in either pre-lunch or post-lunch section to continue.'
      );
      return;
    }

    localStorage.removeItem('taskReport_draft');
    setError('');
    onSubmit(nonEmptyTasks);
  };

  const handleClose = () => {
    if (isHalfDay) {
      const nonEmptyTasks = tasks.filter(task => task.trim());
      if (nonEmptyTasks.length > 0) {
        localStorage.setItem('taskReport_draft', JSON.stringify(nonEmptyTasks));
      }
    } else {
      const nonEmptyPreLunchTasks = preLunchTasks.filter(task => task.trim());
      const nonEmptyPostLunchTasks = postLunchTasks.filter(task => task.trim());
      if (nonEmptyPreLunchTasks.length > 0 || nonEmptyPostLunchTasks.length > 0) {
        localStorage.setItem('taskReport_draft', JSON.stringify({
          preLunchTasks: nonEmptyPreLunchTasks,
          postLunchTasks: nonEmptyPostLunchTasks
        }));
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  // Calculate modal height based on device and keyboard state
  const getModalHeight = () => {
    if (isMobile && isKeyboardVisible) return '70vh';
    if (isMobile) return '85vh';
    return '90vh';
  };

  const isLikelyPostLunch = currentTime.getHours() >= 14;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      {/* Modal Container - Fixed Height with Flexbox Layout */}
      <div 
        ref={modalRef}
        className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col ${
          isMobile ? 'mx-2' : ''
        }`}
        style={{
          height: getModalHeight(),
          maxHeight: getModalHeight(),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER - Fixed at top, never scrolls */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${
                isHalfDay 
                  ? 'bg-amber-100 dark:bg-amber-900/30' 
                  : isLikelyPostLunch 
                    ? 'bg-blue-100 dark:bg-blue-900/30' 
                    : 'bg-green-100 dark:bg-green-900/30'
              }`}>
                {isHalfDay ? (
                  <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                ) : isLikelyPostLunch ? (
                  <Sunset className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Coffee className="h-6 w-6 text-green-600 dark:text-green-400" />
                )}
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {isHalfDay ? 'Half Day Checkout' : 'Daily Task Report'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {isHalfDay 
                    ? 'Summarize your half-day accomplishments' 
                    : 'Record your daily accomplishments before checkout'
                  }
                </p>
              </div>
            </div>
            
            <button 
              onClick={handleClose}
              className="p-2 text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-gray-200 hover:bg-muted dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* WORK SESSION INFO - Fixed section, shows work details */}
        {checkInTime && (
          <div className="flex-shrink-0 px-6 py-4 bg-gray-50 dark:bg-gray-700/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground truncate">{user?.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">
                  {currentTime.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">
                  In: {formatTime(checkInTime)}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Timer className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className={`font-medium ${
                  isHalfDay ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'
                }`}>
                  {workDuration}
                </span>
              </div>
            </div>
            
            {isHalfDay && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                    Half Day Session - Simplified task reporting
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTENT AREA - Scrollable, takes remaining space */}
        <div className="flex-1 min-h-0 flex flex-col">
          <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
            {/* Tasks Section Header */}
            <div className="flex-shrink-0 px-6 pt-6 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-foreground">
                  {isHalfDay ? 'Tasks Completed Today' : 'Tasks & Accomplishments'}
                </h3>
                <div className="text-sm text-muted-foreground">
                  {isHalfDay ? (
                    `${tasks.filter(t => t.trim()).length} task${tasks.filter(t => t.trim()).length !== 1 ? 's' : ''}`
                  ) : (
                    `${(preLunchTasks.filter(t => t.trim()).length + postLunchTasks.filter(t => t.trim()).length)} task${(preLunchTasks.filter(t => t.trim()).length + postLunchTasks.filter(t => t.trim()).length) !== 1 ? 's' : ''}`
                  )}
                </div>
              </div>
            </div>

            {/* SCROLLABLE TASKS AREA - This is the only part that scrolls */}
            <div className="flex-1 min-h-0 px-6 pb-6">
              <div className="h-full overflow-y-auto">
                {isHalfDay ? (
                  /* Half-day tasks - single section */
                  <div className="space-y-3 pb-4">
                    {tasks.map((task, index) => (
                      <div key={index} className="group">
                        <div className="flex items-start space-x-3 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-300 dark:hover:border-blue-500 focus-within:border-blue-500 dark:focus-within:border-blue-400 transition-colors bg-white dark:bg-gray-800">
                          <div className="mt-2 flex-shrink-0">
                            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                          </div>
                          
                          <textarea
                            placeholder={`Task ${index + 1}: What did you accomplish?`}
                            value={task}
                            onChange={(e) => handleTaskChange(index, e.target.value)}
                            className="flex-1 bg-transparent border-0 outline-none resize-none placeholder:text-muted-foreground dark:placeholder:text-muted-foreground text-foreground font-medium leading-relaxed"
                            rows="2"
                            style={{ 
                              minHeight: '48px',
                              maxHeight: '120px'
                            }}
                            onInput={(e) => {
                              e.target.style.height = 'auto';
                              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                            }}
                            required
                          />
                          
                          {tasks.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => handleRemoveTask(index)} 
                              className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Add Task Button for half-day */}
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleAddTask}
                      className="w-full h-12 border-2 border-dashed border-gray-300 dark:border-gray-600 text-muted-foreground hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                    >
                      <PlusCircle className="h-5 w-5 mr-2" />
                      Add Another Task
                    </Button>
                  </div>
                ) : (
                  /* Full-day tasks - pre/post lunch sections */
                  <div className="space-y-6 pb-4">
                    {/* Pre-lunch section */}
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <Coffee className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <h4 className="text-md font-semibold text-foreground">
                          Pre-lunch Tasks (Morning)
                        </h4>
                        <div className="text-sm text-muted-foreground">
                          {preLunchTasks.filter(t => t.trim()).length} task{preLunchTasks.filter(t => t.trim()).length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {preLunchTasks.map((task, index) => (
                          <div key={`pre-${index}`} className="group">
                            <div className="flex items-start space-x-3 p-4 border-2 border-green-200 dark:border-green-700 rounded-xl hover:border-green-300 dark:hover:border-green-500 focus-within:border-green-500 dark:focus-within:border-green-400 transition-colors bg-green-50 dark:bg-green-900/10">
                              <div className="mt-2 flex-shrink-0">
                                <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                              </div>
                              
                              <textarea
                                placeholder={`Morning Task ${index + 1}: What did you accomplish before lunch?`}
                                value={task}
                                onChange={(e) => handlePreLunchTaskChange(index, e.target.value)}
                                className="flex-1 bg-transparent border-0 outline-none resize-none placeholder:text-muted-foreground dark:placeholder:text-muted-foreground text-foreground font-medium leading-relaxed"
                                rows="2"
                                style={{ 
                                  minHeight: '48px',
                                  maxHeight: '120px'
                                }}
                                onInput={(e) => {
                                  e.target.style.height = 'auto';
                                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                }}
                              />
                              
                              {preLunchTasks.length > 1 && (
                                <button 
                                  type="button" 
                                  onClick={() => handleRemovePreLunchTask(index)} 
                                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleAddPreLunchTask}
                          className="w-full h-12 border-2 border-dashed border-green-300 dark:border-green-600 text-green-600 dark:text-green-400 hover:border-green-400 dark:hover:border-green-500 hover:text-green-700 dark:hover:text-green-300 transition-all"
                        >
                          <PlusCircle className="h-5 w-5 mr-2" />
                          Add Pre-lunch Task
                        </Button>
                      </div>
                    </div>

                    {/* Post-lunch section */}
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <Sunset className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <h4 className="text-md font-semibold text-foreground">
                          Post-lunch Tasks (Afternoon)
                        </h4>
                        <div className="text-sm text-muted-foreground">
                          {postLunchTasks.filter(t => t.trim()).length} task{postLunchTasks.filter(t => t.trim()).length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {postLunchTasks.map((task, index) => (
                          <div key={`post-${index}`} className="group">
                            <div className="flex items-start space-x-3 p-4 border-2 border-blue-200 dark:border-blue-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-500 focus-within:border-blue-500 dark:focus-within:border-blue-400 transition-colors bg-blue-50 dark:bg-blue-900/10">
                              <div className="mt-2 flex-shrink-0">
                                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                              </div>
                              
                              <textarea
                                placeholder={`Afternoon Task ${index + 1}: What did you accomplish after lunch?`}
                                value={task}
                                onChange={(e) => handlePostLunchTaskChange(index, e.target.value)}
                                className="flex-1 bg-transparent border-0 outline-none resize-none placeholder:text-muted-foreground dark:placeholder:text-muted-foreground text-foreground font-medium leading-relaxed"
                                rows="2"
                                style={{ 
                                  minHeight: '48px',
                                  maxHeight: '120px'
                                }}
                                onInput={(e) => {
                                  e.target.style.height = 'auto';
                                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                }}
                              />
                              
                              {postLunchTasks.length > 1 && (
                                <button 
                                  type="button" 
                                  onClick={() => handleRemovePostLunchTask(index)} 
                                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleAddPostLunchTask}
                          className="w-full h-12 border-2 border-dashed border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-all"
                        >
                          <PlusCircle className="h-5 w-5 mr-2" />
                          Add Post-lunch Task
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message - Inside scrollable area */}
                {error && (
                  <div className="flex items-center space-x-3 p-4 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                      {error}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* FOOTER - Fixed at bottom, never scrolls, always accessible */}
        <div className="flex-shrink-0 px-6 py-5 border-t border-border bg-muted/50 rounded-b-2xl">
          <div className={`flex gap-3 ${isMobile ? 'flex-col-reverse' : 'flex-row justify-end'}`}>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
              className={isMobile ? 'w-full h-12' : ''}
            >
              Cancel
            </Button>
            
            {isOptional && onSkip && (
              <Button 
                type="button" 
                variant="outline"
                onClick={onSkip}
                disabled={isLoading}
                className={`text-muted-foreground hover:text-foreground dark:hover:text-gray-200 ${isMobile ? 'w-full h-12' : ''}`}
              >
                Skip & Check Out
              </Button>
            )}
            
            <Button 
              onClick={handleSubmit}
              disabled={isLoading || (isHalfDay 
                ? tasks.filter(t => t.trim()).length === 0 
                : (preLunchTasks.filter(t => t.trim()).length + postLunchTasks.filter(t => t.trim()).length) === 0
              )}
              className={`bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all ${isMobile ? 'w-full h-12' : 'px-8'}`}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>{isHalfDay ? 'Complete Half Day' : 'Submit & Check Out'}</span>
                </div>
              )}
            </Button>
          </div>
          
          {/* Auto-save indicator */}
          {(isHalfDay 
            ? tasks.filter(t => t.trim()).length > 0 
            : (preLunchTasks.filter(t => t.trim()).length + postLunchTasks.filter(t => t.trim()).length) > 0
          ) && (
            <div className="flex items-center justify-center space-x-2 mt-3 text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3" />
              <span>Tasks auto-saved locally</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskReportModal;