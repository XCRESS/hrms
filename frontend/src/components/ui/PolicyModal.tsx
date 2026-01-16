import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  X,
  FileText,
  Calendar,
  Users,
  AlertTriangle,
  Tag,
  Clock,
  Shield
} from "lucide-react";
import { usePolicy } from "@/hooks/queries";

interface Policy {
  title: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  targetAudience: string;
  version?: number;
  acknowledgmentRequired?: boolean;
  effectiveDate: string;
  expiryDate?: string;
  content: string;
  tags?: string[];
}

interface PolicyModalProps {
  policyId: string;
  isOpen: boolean;
  onClose: () => void;
}

type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

const PolicyModal = ({ policyId, isOpen, onClose }: PolicyModalProps) => {
  const { data: policy, isLoading: loading, error } = usePolicy(policyId, {
    enabled: isOpen && !!policyId
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPriorityColor = (priority: Priority) => {
    const colors: Record<Priority, string> = {
      'Low': 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-800',
      'Medium': 'text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900',
      'High': 'text-orange-600 bg-orange-100 dark:text-orange-300 dark:bg-orange-900',
      'Critical': 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900'
    };
    return colors[priority] || colors['Medium'];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Company Policy
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Policy Details
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
              <span className="ml-3 text-slate-600 dark:text-slate-400">Loading policy...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 dark:text-red-400 text-lg">{String(error)}</p>
            </div>
          ) : policy ? (
            <div className="space-y-6">
              {/* Policy Header */}
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {policy.title}
                  </h1>

                  {/* Policy Meta Information */}
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      <span className="font-medium">Category:</span>
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                        {policy.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      <span className="font-medium">Priority:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(policy.priority)}`}>
                        {policy.priority}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">Target:</span>
                      <span>{policy.targetAudience}</span>
                    </div>

                    {policy.version && policy.version > 1 && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">Version:</span>
                        <span>{policy.version}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Acknowledgment Required Notice */}
                {policy.acknowledgmentRequired && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      <span className="font-medium text-orange-800 dark:text-orange-200">
                        Acknowledgment Required
                      </span>
                    </div>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      This policy requires your acknowledgment and understanding.
                    </p>
                  </div>
                )}

                {/* Effective Dates */}
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Effective From</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {formatDate(policy.effectiveDate)}
                        </p>
                      </div>
                    </div>

                    {policy.expiryDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Expires On</p>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {formatDate(policy.expiryDate)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Policy Content */}
              <Card className="border-0 shadow-sm bg-white dark:bg-slate-700">
                <CardHeader className="border-b border-slate-200 dark:border-slate-600 pb-4">
                  <CardTitle className="text-slate-900 dark:text-slate-100">
                    Policy Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    {policy.content.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              {policy.tags && policy.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {policy.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : null}
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

export default PolicyModal;
