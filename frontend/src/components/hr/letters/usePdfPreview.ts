import { useState } from 'react';

export interface PdfPreview {
  url: string;
  title: string;
  filename: string;
}

/** Holds the object URL for a previewed PDF and revokes it when the preview closes. */
export const usePdfPreview = () => {
  const [preview, setPreview] = useState<PdfPreview | null>(null);
  const show = (blob: Blob, title: string, filename = title) => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview({ url: URL.createObjectURL(blob), title, filename });
  };
  const close = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };
  return { preview, show, close };
};
