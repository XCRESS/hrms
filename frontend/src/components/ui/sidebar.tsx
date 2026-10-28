import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { IconDots } from "@tabler/icons-react";
import { NavLink } from "react-router";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogPortal, DialogOverlay } from "./dialog";
import { useMediaQuery } from '../../hooks/use-media-query';

/**
 * Width of the desktop rail when collapsed / expanded, consumed by the content
 * offset in Sidebar.tsx.
 *
 * These must match the `w-20` / `w-60` utilities on DesktopSidebar. The rail
 * itself cannot use these constants: Tailwind scans source text statically, so
 * a class built from a variable never gets generated.
 */
export const SIDEBAR_WIDTH_COLLAPSED = 80;  // w-20
export const SIDEBAR_WIDTH_EXPANDED = 240;  // w-60

interface Links {
  label: string;
  href?: string; // href is optional for non-navigation links like logout
  icon: React.JSX.Element | React.ReactNode;
  /** Solid variant shown on the active route. Must be a real filled asset
   *  (e.g. Tabler's `*Filled`), not the outline icon with fill forced on. */
  activeIcon?: React.JSX.Element | React.ReactNode;
  onClick?: () => void;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate: animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = ({
  tabs,
  ...props
}: React.ComponentProps<"div"> & { tabs?: Links[] }) => {
  return (
    <>
      {/* `tabs` is mobile-only: the desktop rail shows every link already. */}
      <DesktopSidebar {...props} />
      <MobileSidebar tabs={tabs} {...props} />
    </>
  );
};

/**
 * Desktop rail. Expands on hover or keyboard focus.
 *
 * Entirely CSS — no state, no event handlers, no JS-driven width.
 *
 * Every earlier version routed hover through React: pointerenter -> setState
 * -> re-render -> new width. Because the rail is fixed-position directly under
 * the cursor, each animation frame relaid out the element under the pointer,
 * which could re-fire the pointer events, which set state again and re-targeted
 * the animation mid-flight. The rail settled at whatever partial width it
 * happened to reach, with labels clipped mid-word.
 *
 * `:hover` and `:focus-within` cannot cause that feedback: the browser resolves
 * them against the element's own box, not per-frame React output, so the width
 * transition runs to completion no matter how the pointer moves. This is also
 * why the mid-animation state is unreachable rather than merely unlikely.
 */
export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { animate } = useSidebar();

  return (
    <div
      data-sidebar-rail=""
      className={cn(
        "group/rail h-full px-4 py-4 hidden md:flex md:flex-col bg-sidebar border-r border-sidebar-border fixed left-0 top-0 z-50 shadow-lg",
        // Clips the labels while collapsed, so they only need to fade.
        "overflow-x-hidden",
        "transition-[width] duration-200 ease-out motion-reduce:transition-none",
        // w-20 = 80px, w-60 = 240px — the SIDEBAR_WIDTH_* constants below.
        // Written as literal classes, not var() indirection, so Tailwind's
        // scanner can see them statically.
        //
        // has-[:focus-visible] rather than focus-within: :focus-within also
        // matches mouse clicks, so clicking a link left the rail pinned open
        // after navigating until you clicked elsewhere. :focus-visible is only
        // set when the browser decides focus should be shown — keyboard
        // navigation — which is the case the expansion is actually for.
        animate
          ? "w-20 hover:w-60 has-focus-visible:w-60"
          : "w-60",
        className
      )}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Mobile navigation: a fixed bottom tab bar plus an overflow drawer.
 *
 * `tabs` are the primary destinations, one tap each in the thumb zone;
 * `children` is the full link list, shown in the drawer behind "More".
 */
export const MobileSidebar = ({
  className,
  children,
  tabs = [],
  ...props
}: React.ComponentProps<"div"> & { tabs?: Links[] }) => {
  const { open, setOpen } = useSidebar();
  return (
    <div
      className={cn(
        // Fixed to the bottom so it stays in the thumb zone while content
        // scrolls. AppLayout reserves matching space so nothing hides beneath.
        "fixed inset-x-0 bottom-0 z-50 flex flex-row md:hidden items-stretch bg-sidebar border-t border-sidebar-border",
        className
      )}
      // Clears the home indicator on notched devices; falls back to a small
      // pad where there is no inset.
      style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
      {...props}
    >
      <Dialog open={open} onOpenChange={setOpen}>
        {tabs.map((tab) => (
          <NavLink
            key={tab.href}
            to={tab.href ?? '#'}
            className={({ isActive }) =>
              cn(
                // min-h-14 keeps the full tab (icon + label) above the 44px
                // HIG/Material target, well clear of the WCAG 2.5.8 floor.
                "flex flex-1 items-center justify-center min-h-14 px-1 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring",
                isActive
                  ? "text-sidebar-foreground"
                  : "text-sidebar-foreground/45"
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Instagram's pattern: no pill, no background — the icon
                    swaps from its outline asset to its solid one. */}
                {isActive && tab.activeIcon ? tab.activeIcon : tab.icon}
                {/* Icon-only visually, but the name still has to reach screen
                    readers — an unlabelled link announces as just "link". */}
                <span className="sr-only">{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Opens the drawer holding every destination that is not a tab. */}
        <DialogPrimitive.Trigger
          aria-label="More navigation options"
          className={cn(
            "flex flex-1 items-center justify-center min-h-14 px-1 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring",
            // Matches the tabs so the bar reads as one row of four.
            open
              ? "text-sidebar-foreground"
              : "text-sidebar-foreground/45"
          )}
        >
          <IconDots className="h-6 w-6 shrink-0" aria-hidden="true" />
        </DialogPrimitive.Trigger>

        {/* Radix supplies the focus trap, ESC handling, scroll lock, inert
            background and aria-modal that the hand-rolled overlay lacked. */}
        <DialogPortal>
          <DialogOverlay className="md:hidden" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={cn(
              // Slides up from the bottom, matching where the trigger lives.
              "fixed inset-x-0 bottom-0 z-100 flex max-h-[85dvh] flex-col overflow-y-auto rounded-t-2xl bg-sidebar p-6 shadow-xl md:hidden",
              "duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
            )}
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            {/* Required for aria-modal labelling; visually hidden because the
                drawer shows navigation, not a heading. */}
            <DialogPrimitive.Title className="sr-only">
              Navigation menu
            </DialogPrimitive.Title>
            {/* Grab handle: the affordance that says "this sheet dismisses". */}
            <div
              aria-hidden="true"
              className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-sidebar-foreground/20"
            />
            {children}
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
}) => {
  // Only setOpen: the desktop rail's expansion is pure CSS now, so a link has
  // nothing to read. setOpen still closes the mobile drawer after navigating.
  const { setOpen } = useSidebar();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const handleLinkClick = () => {
    if (link.onClick) {
      link.onClick();
    }
    if (isMobile) {
      setOpen(false);
    }
  };

  const linkContent = (
    <>
      {link.icon}
      {/* Fades with the rail via CSS, so no React state sits between the
          pointer and the animation. Never aria-hidden — it stays transparent
          rather than hidden, so collapsed links keep an accessible name.
          `max-md:opacity-100` pins it visible inside the mobile drawer, where
          there is no rail to key off. */}
      <span className={cn(
        // No text-* colour: inherits from the row so active/hover states apply.
        "text-sm whitespace-pre inline-block p-0! m-0!",
        "opacity-0 max-md:opacity-100",
        // Mirrors the rail's own trigger pair exactly — if these drift, the
        // labels fade on a different condition than the width animates.
        "group-hover/rail:opacity-100 group-has-focus-visible/rail:opacity-100",
        "transition-opacity duration-150 ease-out motion-reduce:transition-none"
      )}>
        {link.label}
      </span>
    </>
  );

  const linkClasses = (isActive: boolean) =>
    cn(
      // min-h-11 = 44px touch target (Apple HIG / Material).
      // Padding and transition stay geometry-free so nothing shifts while the
      // rail animates its width.
      "flex items-center justify-start gap-3 group/sidebar min-h-11 py-2.5 px-4 rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
      // Tint derives from the foreground, not --sidebar-accent: accent is
      // oklch(0.97) on a 0.985 sidebar, a 1.04:1 ratio that reads as nothing.
      isActive
        ? "bg-sidebar-foreground/10 text-sidebar-foreground font-semibold"
        : "text-sidebar-foreground/70 hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground",
      className
    );

  if (link.href) {
    return (
      <NavLink
        to={link.href}
        onClick={handleLinkClick}
        className={({ isActive }) => linkClasses(isActive)}
        {...props}
      >
        {linkContent}
      </NavLink>
    );
  }

  // Render a button for actions without a link (like logout)
  return (
    <button
      type="button"
      onClick={handleLinkClick}
      className={cn(linkClasses(false), "w-full")}
      {...props}
    >
      {linkContent}
    </button>
  );
};
