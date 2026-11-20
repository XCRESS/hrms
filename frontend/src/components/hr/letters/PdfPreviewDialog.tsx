import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { PdfPreview } from './usePdfPreview';

export const PdfPreviewDialog = ({ preview, onClose }: { preview: PdfPreview | null; onClose: () => void }) => (
  <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="flex h-[90vh] max-w-4xl flex-col gap-3">
      <DialogHeader className="flex-row items-center justify-between gap-4 space-y-0 pr-8">
        <div>
          <DialogTitle>{preview?.title}</DialogTitle>
          <DialogDescription className="sr-only">PDF preview</DialogDescription>
        </div>
        {preview && (
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={preview.url} download={`${preview.filename}.pdf`}>
              <Download className="h-4 w-4" /> Download
            </a>
          </Button>
        )}
      </DialogHeader>
      {preview && <iframe title={preview.title} src={preview.url} className="w-full flex-1 rounded border border-border bg-muted" />}
    </DialogContent>
  </Dialog>
);
