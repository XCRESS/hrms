import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { IconMenu2 } from "@tabler/icons-react";
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

export const SidebarBody = (props: React.ComponentProps<"div">) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...props} />
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

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <div
      className={cn(
        // h-10 with py-4 meant the padding exceeded the declared height. The
        // bar is now sized by its content and clears the status bar on an
        // installed PWA (display: standalone + black-translucent status bar).
        "flex flex-row md:hidden items-center justify-between bg-sidebar border-b border-sidebar-border w-full px-2 py-1",
        className
      )}
      style={{ paddingTop: 'max(0.25rem, env(safe-area-inset-top))' }}
      {...props}
    >
      <Dialog open={open} onOpenChange={setOpen}>
        <div className="flex justify-end w-full">
          {/* Was a bare <IconMenu2 onClick>: an SVG with no role, no tabIndex
              and no accessible name. Since this is the only way to navigate on
              mobile, keyboard and screen reader users could not move around the
              app at all. It is a real button now, at a 44px WCAG/HIG target. */}
          <DialogPrimitive.Trigger
            aria-label="Open navigation menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <IconMenu2 aria-hidden="true" />
          </DialogPrimitive.Trigger>
        </div>

        {/* Radix supplies the focus trap, ESC handling, scroll lock, inert
            background and aria-modal that the hand-rolled overlay lacked. */}
        <DialogPortal>
          <DialogOverlay className="md:hidden" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={cn(
              "fixed inset-y-0 left-0 z-100 flex h-full w-[85%] max-w-sm flex-col justify-between overflow-y-auto bg-sidebar p-6 shadow-xl md:hidden",
              "duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
            )}
            style={{
              paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
              paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
            }}
          >
            {/* Required for aria-modal labelling; visually hidden because the
                drawer shows navigation, not a heading. */}
            <DialogPrimitive.Title className="sr-only">
              Navigation menu
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close navigation menu"
              className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
            >
              <span aria-hidden="true" className="text-xl leading-none">&times;</span>
            </DialogPrimitive.Close>
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
      {/* Fades with the rail via group-hover/group-focus-within rather than by
          reading `open`, so no React state sits between the pointer and the
          animation. Inside the mobile drawer there is no rail to key off, so
          `max-md:opacity-100` pins it visible there.

          The label stays in the DOM and is never aria-hidden: it is only
          transparent and clipped, so it still gives every collapsed link an
          accessible name. The original animated `display`, which cannot
          transition and did remove the name from the a11y tree. */}
      <span className={cn(
        "text-sidebar-foreground text-sm whitespace-pre inline-block p-0! m-0!",
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
      // min-h-11 keeps every row at the 44px touch target recommended by
      // Apple HIG / Material, comfortably above the WCAG 2.5.8 24px floor.
      //
      // Padding is constant. It previously switched px-4 -> px-3 on open,
      // which nudged every icon sideways mid-animation and added to the
      // layout thrash that made the rail oscillate. transition-colors rather
      // than transition-all for the same reason: no geometry animates here.
      "flex items-center justify-start gap-3 group/sidebar min-h-11 py-2.5 px-4 rounded-xl transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
      {
        "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm": isActive,
      },
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
