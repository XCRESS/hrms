import { useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Inline PDF viewer for a Blob; the object URL lives exactly as long as the frame. */
export const PdfFrame = ({ blob, title, filename }: { blob: Blob; title: string; filename: string }) => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    if (frameRef.current) frameRef.current.src = url;
    if (linkRef.current) linkRef.current.href = url;
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <a ref={linkRef} download={`${filename}.pdf`}>
            <Download className="h-4 w-4" /> Download
          </a>
        </Button>
      </div>
      <iframe ref={frameRef} title={title} className="h-[80vh] w-full rounded border border-border bg-muted" />
    </div>
  );
};
