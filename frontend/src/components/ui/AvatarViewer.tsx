import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, Trash2, User, Loader2 } from 'lucide-react';
import { useToast } from './toast';
import { useUploadDocument, useDeleteDocument } from '@/hooks/queries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface AvatarViewerProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string | null;
  name: string;
  /** Employee whose picture is shown. Required to upload or remove. */
  employeeId: string | null;
  /** Document id of the stored picture. Required to remove. */
  documentId?: string | null;
  /** Whether the current user may change or remove this picture. */
  canEdit?: boolean;
}

const AvatarViewer = ({
  open,
  onClose,
  imageUrl,
  name,
  employeeId,
  documentId = null,
  canEdit = false,
}: AvatarViewerProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const busy = uploadMutation.isPending || deleteMutation.isPending;

  // Dialog handles Escape, scroll locking, focus trapping and the portal.

  // Reset the confirmation prompt whenever the viewer is reopened.
  useEffect(() => {
    if (!open) setConfirmingRemove(false);
  }, [open]);

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    // Allow picking the same file again after a failed attempt.
    event.target.value = '';
    if (!file || !employeeId) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Unsupported file',
        description: 'Please choose an image file.',
        variant: 'error',
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Profile pictures must be 5MB or smaller.',
        variant: 'error',
      });
      return;
    }

    uploadMutation.mutate(
      { employeeId, documentType: 'profile_picture', file },
      {
        onSuccess: () => {
          toast({ title: 'Profile picture updated' });
        },
        onError: (error: Error) => {
          toast({
            title: 'Upload failed',
            description: error.message || 'Could not update the profile picture.',
            variant: 'error',
          });
        },
      }
    );
  };

  const handleRemove = (): void => {
    if (!documentId || !employeeId) return;

    deleteMutation.mutate(
      { documentId, employeeId, documentType: 'profile_picture' },
      {
        onSuccess: () => {
          setConfirmingRemove(false);
          toast({ title: 'Profile picture removed' });
          onClose();
        },
        onError: (error: Error) => {
          toast({
            title: 'Removal failed',
            description: error.message || 'Could not remove the profile picture.',
            variant: 'error',
          });
        },
      }
    );
  };

  const initial = name?.trim().charAt(0).toUpperCase() || '';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Ignore dismissals while an upload or delete is in flight.
        if (!next && !busy) onClose();
      }}
    >
      <DialogContent
        // Full-screen lightbox rather than a centered card.
        className="max-w-none w-screen h-screen translate-x-0 translate-y-0 left-0 top-0 flex flex-col gap-0 rounded-none border-0 bg-black/95 p-0 sm:rounded-none"
        onEscapeKeyDown={(e) => busy && e.preventDefault()}
        onInteractOutside={(e) => busy && e.preventDefault()}
      >
        {/* Top bar */}
        <div className="flex items-center gap-4 px-4 py-4 pr-16 text-white">
          <DialogTitle className="text-lg font-medium truncate text-white">
            {name}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {`Profile picture for ${name}.`}
          </DialogDescription>
        </div>

        {/* Image */}
        <div className="flex-1 flex items-center justify-center px-4 min-h-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="max-h-full max-w-full object-contain rounded-lg animate-in zoom-in-95 duration-200"
          />
        ) : (
          <div className="w-48 h-48 rounded-full bg-white/10 flex items-center justify-center text-white">
            {initial ? (
              <span className="text-7xl font-semibold">{initial}</span>
            ) : (
              <User size={80} />
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {canEdit && (
        <div className="px-4 py-6">
          {confirmingRemove ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-white text-sm">Remove this profile picture?</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfirmingRemove(false)}
                  disabled={busy}
                  className="px-5 py-2.5 rounded-full text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemove}
                  disabled={busy}
                  className="px-5 py-2.5 rounded-full text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {deleteMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={busy || !employeeId}
                className="px-5 py-2.5 rounded-full text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {uploadMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Camera size={16} />
                )}
                {uploadMutation.isPending
                  ? 'Uploading...'
                  : imageUrl
                    ? 'Change photo'
                    : 'Add photo'}
              </button>

              {imageUrl && documentId && (
                <button
                  onClick={() => setConfirmingRemove(true)}
                  disabled={busy}
                  className="px-5 py-2.5 rounded-full text-sm font-medium text-white bg-white/10 hover:bg-red-600/80 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Remove photo
                </button>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={busy}
          />
        </div>
      )}
      </DialogContent>
    </Dialog>
  );
};

export default AvatarViewer;
