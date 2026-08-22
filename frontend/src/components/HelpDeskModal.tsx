import { useState, FormEvent, ChangeEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [category, setCategory] = useState("technical");
  const [priority, setPriority] = useState<HelpDeskData['priority']>("medium");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({
      title: inquiryTitle,
      message: inquiryMessage,
      category,
      priority
    });
    setInquiryTitle("");
    setInquiryMessage("");
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
            <Input
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
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="inquiryCategoryModal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="payroll">Payroll</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="inquiryPriorityModal" className="block text-sm font-medium text-foreground mb-1">Priority</label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as HelpDeskData['priority'])}
              >
                <SelectTrigger id="inquiryPriorityModal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
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
