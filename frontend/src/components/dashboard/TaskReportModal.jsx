import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, XCircle } from 'lucide-react';

const TaskReportModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [tasks, setTasks] = useState(['']);

  useEffect(() => {
    if (isOpen) {
      setTasks(['']); // Reset to one empty task when modal opens
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const nonEmptyTasks = tasks.map(t => t.trim()).filter(t => t !== '');
    if (nonEmptyTasks.length > 0) {
      onSubmit(nonEmptyTasks);
    } else {
      // Maybe show a small error message here
      console.log("Please enter at least one task.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center animate-modal-pop-in">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-2xl p-6 lg:p-8 w-full max-w-md m-4 transform transition-all duration-300">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Today's Work Report</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
            <XCircle size={24} />
          </button>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          Please list the tasks you completed today before checking out.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="max-h-60 overflow-y-auto pr-2 space-y-3">
            {tasks.map((task, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-neutral-500">&#8226;</span>
                <Input
                  type="text"
                  placeholder={`Task #${index + 1}`}
                  value={task}
                  onChange={(e) => handleTaskChange(index, e.target.value)}
                  className="flex-grow"
                  required
                />
                {tasks.length > 1 && (
                  <button type="button" onClick={() => handleRemoveTask(index)} className="text-red-500 hover:text-red-700">
                    <XCircle size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>
           <div className="flex justify-start pt-2">
             <Button type="button" variant="outline" size="sm" onClick={handleAddTask} className="flex items-center gap-2">
               <PlusCircle size={16} />
               Add Task
             </Button>
           </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? 'Submitting...' : 'Submit & Check Out'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskReportModal; 