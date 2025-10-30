import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  X,
  Bell,
  Calendar,
  Users,
  AlertTriangle,
  User
} from "lucide-react";

const AnnouncementModal = ({ announcement, isOpen, onClose }) => {
  const [loading] = useState(false);

  useEffect(() => {
    // Handle escape key to close modal
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Low': 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-800',
      'Medium': 'text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900',
      'High': 'text-orange-600 bg-orange-100 dark:text-orange-300 dark:bg-orange-900',
      'Critical': 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900'
    };
    return colors[priority] || colors['Medium'];
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Announcement
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Company Update
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-slate-600 dark:text-slate-400">Loading announcement...</span>
            </div>
          ) : announcement ? (
            <div className="space-y-6">
              {/* Announcement Header */}
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {announcement.title}
                  </h1>

                  {/* Announcement Meta Information */}
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                    {announcement.priority && (
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">Priority:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(announcement.priority)}`}>
                          {announcement.priority}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">Audience:</span>
                      <span className="capitalize">{announcement.targetAudience || 'All'}</span>
                    </div>

                    {(announcement.authorName || announcement.author?.name) && (
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span className="font-medium">Posted by:</span>
                        <span>{announcement.authorName || announcement.author?.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Published Date */}
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Published On</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {formatDate(announcement.createdAt || announcement.date)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Announcement Content */}
              <Card className="border-0 shadow-sm bg-white dark:bg-slate-700">
                <CardHeader className="border-b border-slate-200 dark:border-slate-600 pb-4">
                  <CardTitle className="text-slate-900 dark:text-slate-100">
                    Announcement Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    {announcement.content.split('\n').map((paragraph, index) => (
                      paragraph.trim() && (
                        <p key={index} className="mb-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                          {paragraph}
                        </p>
                      )
                    ))}
                  </div>
                </CardContent>
              </Card>

            </div>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400 text-lg">No announcement data available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-slate-200 dark:border-slate-600">
          <Button
            onClick={onClose}
            className="bg-slate-600 hover:bg-slate-700 text-white"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementModal;
