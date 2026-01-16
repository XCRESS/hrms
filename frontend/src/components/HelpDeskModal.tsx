import { useState, FormEvent, ChangeEvent } from "react";
import { X, UploadCloud } from "lucide-react";

interface HelpDeskData {
  title: string;
  message: string;
  file: File | null;
  isAnonymous: boolean;
  category: string;
  priority: string;
}

interface HelpDeskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: HelpDeskData) => void;
  isLoading: boolean;
}

const HelpDeskModal = ({ isOpen, onClose, onSubmit, isLoading }: HelpDeskModalProps) => {
  const [inquiryTitle, setInquiryTitle] = useState("");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [category, setCategory] = useState("technical");
  const [priority, setPriority] = useState("medium");

  if (!isOpen) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({
      title: inquiryTitle,
      message: inquiryMessage,
      file: selectedFile,
      isAnonymous,
      category,
      priority
    });
    setInquiryTitle("");
    setInquiryMessage("");
    setSelectedFile(null);
    setIsAnonymous(false);
    setCategory("technical");
    setPriority("medium");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 md:p-8 transform transition-all duration-300 ease-out scale-95 animate-modal-pop-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-slate-100">Submit an Inquiry</h2>
           <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="inquiryTitleModal" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Title</label>
            <input
              id="inquiryTitleModal"
              type="text"
              value={inquiryTitle}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setInquiryTitle(e.target.value)}
              placeholder="e.g., Payroll issue, IT support"
              className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="inquiryCategoryModal" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Category</label>
              <select
                id="inquiryCategoryModal"
                value={category}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
              >
                <option value="technical">Technical</option>
                <option value="hr">HR</option>
                <option value="payroll">Payroll</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="inquiryPriorityModal" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Priority</label>
              <select
                id="inquiryPriorityModal"
                value={priority}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setPriority(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="inquiryMessageModal" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Message</label>
            <textarea
              id="inquiryMessageModal"
              value={inquiryMessage}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInquiryMessage(e.target.value)}
              placeholder="Describe your issue or question in detail..."
              rows={4}
              className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
              required
              data-gramm="false"
            />
          </div>

          <div>
            <label htmlFor="fileAttachmentModal" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Attach File (Optional)</label>
            <label
              htmlFor="fileAttachmentInputModal"
              className="flex flex-col items-center justify-center w-full h-28 border-2 border-gray-300 dark:border-slate-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600/70 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-8 h-8 mb-2 text-gray-500 dark:text-slate-400" />
                <p className="mb-1 text-sm text-gray-500 dark:text-slate-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-500">PNG, JPG, PDF (MAX. 5MB)</p>
              </div>
              <input id="fileAttachmentInputModal" type="file" className="hidden" onChange={handleFileChange} />
            </label>
            {selectedFile && <p className="mt-2 text-xs text-gray-600 dark:text-slate-400">Selected: {selectedFile.name}</p>}
          </div>

          <div className="flex items-center">
            <input
              id="anonymousCheckModal"
              type="checkbox"
              checked={isAnonymous}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-cyan-600 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500 dark:focus:ring-cyan-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
            />
            <label htmlFor="anonymousCheckModal" className="ml-2 text-sm font-medium text-gray-900 dark:text-slate-300">Submit Anonymously</label>
          </div>

          <div className="flex justify-end items-center gap-3 pt-4">
             <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700/80 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600/80 focus:ring-4 focus:outline-none focus:ring-gray-200 dark:focus:ring-slate-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:ring-4 focus:outline-none focus:ring-cyan-300 dark:bg-cyan-500 dark:hover:bg-cyan-600 dark:focus:ring-cyan-700 rounded-lg transition-colors disabled:opacity-70"
            >
              {isLoading ? "Sending..." : "Send Inquiry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HelpDeskModal;
