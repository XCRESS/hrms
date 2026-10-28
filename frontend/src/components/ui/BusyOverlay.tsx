interface BusyOverlayProps {
  /** Render the overlay. Pass the relevant mutation's pending state. */
  show: boolean;
  /** Status text shown beside the spinner. */
  message?: string;
}

/**
 * Full-screen busy indicator for in-flight mutations (upload, delete).
 *
 * Not a dialog — it takes no focus and cannot be dismissed, so it deliberately
 * does not use ui/dialog. `aria-live` announces it to screen readers instead.
 */
const BusyOverlay = ({ show, message = "Working..." }: BusyOverlayProps) => {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-6 shadow-lg">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden="true"
        />
        <span className="text-card-foreground">{message}</span>
      </div>
    </div>
  );
};

export default BusyOverlay;
