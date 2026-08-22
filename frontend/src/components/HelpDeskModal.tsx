import { useState, FormEvent, ChangeEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface HelpDeskData {
  title: string;
  message: string;
  file: File | null;
  isAnonymous: boolean;
  category: string;
  priority: 'low' | 'medium' | 'high';
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
  const [priority, setPriority] = useState<HelpDeskData['priority']>("medium");

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-6 md:p-8">
        <DialogHeader className="mb-6 pr-8 text-left">
          <DialogTitle className="text-2xl font-semibold text-foreground">Submit an Inquiry</DialogTitle>
          <DialogDescription className="sr-only">
            Submit a help desk inquiry to HR.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="inquiryTitleModal" className="block text-sm font-medium text-foreground mb-1">Title</label>
            <input
              id="inquiryTitleModal"
              type="text"
              value={inquiryTitle}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setInquiryTitle(e.target.value)}
              placeholder="e.g., Payroll issue, IT support"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="inquiryCategoryModal" className="block text-sm font-medium text-foreground mb-1">Category</label>
              <select
                id="inquiryCategoryModal"
                value={category}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)}
              >
                <option value="technical">Technical</option>
                <option value="hr">HR</option>
                <option value="payroll">Payroll</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="inquiryPriorityModal" className="block text-sm font-medium text-foreground mb-1">Priority</label>
              <select
                id="inquiryPriorityModal"
                value={priority}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setPriority(e.target.value as HelpDeskData['priority'])}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="inquiryMessageModal" className="block text-sm font-medium text-foreground mb-1">Message</label>
            <Textarea
              id="inquiryMessageModal"
              value={inquiryMessage}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInquiryMessage(e.target.value)}
              placeholder="Describe your issue or question in detail..."
              rows={4}
              required
              data-gramm="false"
            />
          </div>

          <div>
            <label htmlFor="fileAttachmentModal" className="block text-sm font-medium text-foreground mb-1">Attach File (Optional)</label>
            <label
              htmlFor="fileAttachmentInputModal"
              className="flex flex-col items-center justify-center w-full h-28 border-2 border-border border-dashed rounded-lg cursor-pointer bg-muted hover:bg-accent transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                <p className="mb-1 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG, PDF (MAX. 5MB)</p>
              </div>
              <input id="fileAttachmentInputModal" type="file" className="hidden" onChange={handleFileChange} />
            </label>
            {selectedFile && <p className="mt-2 text-xs text-muted-foreground">Selected: {selectedFile.name}</p>}
          </div>

          <div className="flex items-center">
            <input
              id="anonymousCheckModal"
              type="checkbox"
              checked={isAnonymous}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-primary bg-muted border-border rounded focus:ring-2 focus:ring-ring"
            />
            <label htmlFor="anonymousCheckModal" className="ml-2 text-sm font-medium text-foreground">Submit Anonymously</label>
          </div>

          <div className="flex justify-end items-center gap-3 pt-4">
             <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-foreground bg-card/80 border border-border rounded-lg hover:bg-accent focus:ring-4 focus:outline-none focus:ring-ring transition-colors"
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
      </DialogContent>
    </Dialog>
  );
};

export default HelpDeskModal;
