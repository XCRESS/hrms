import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * `default` — a bordered field, matching `ui/input`.
   * `bare` — no border or background, for textareas embedded in a composer
   *   or card that already provides the chrome.
   */
  variant?: "default" | "bare";
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        variant === "default" &&
          "resize-none rounded-lg border border-border bg-card px-3 py-2 transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        variant === "bare" &&
          "resize-none border-0 bg-transparent font-medium leading-relaxed outline-none",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
