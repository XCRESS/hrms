import { useState, type ReactNode } from "react";
import { NavLink } from "react-router";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { DialogClose, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import Avatar from "./ui/avatarIcon";
import { useConfirm } from "./ui/confirm-dialog";
import { useSidebar } from "./ui/sidebar";
import { cn } from "@/lib/utils";

export interface MenuItem {
  label: string;
  href?: string;
  icon: ReactNode;
  section?: string;
}

interface MoreMenuProps {
  user: { name?: string; email?: string };
  items: MenuItem[];
  onLogout: () => void;
}

const ROW_ICON = "flex size-6 shrink-0 items-center justify-center [&>svg]:size-6 [&>svg]:stroke-[1.75]";

/** Full-screen mobile menu behind the bottom bar's "more" button. Must render inside MobileSidebar's dialog. */
export default function MoreMenu({ user, items, onLogout }: MoreMenuProps) {
  const [query, setQuery] = useState("");
  const { setOpen } = useSidebar();
  const confirm = useConfirm();
  const name = user.name || "User";

  const q = query.trim().toLowerCase();
  const matches = (text: string) => text.toLowerCase().includes(q);

  const sections: { title: string; items: (MenuItem & { href: string })[] }[] = [];
  for (const item of items) {
    if (!item.href || !item.section) continue;
    if (q && !matches(item.label) && !matches(item.section)) continue;
    const existing = sections.find((s) => s.title === item.section);
    if (existing) existing.items.push({ ...item, href: item.href });
    else sections.push({ title: item.section, items: [{ ...item, href: item.href }] });
  }

  const showProfile = !q || ["profile", "account", "password", name, user.email ?? ""].some(matches);
  const showLogout = !q || ["log out", "logout", "sign out"].some(matches);
  const nothingFound = !showProfile && !showLogout && sections.length === 0;

  const close = () => setOpen(false);

  // The sheet closes first: the confirm dialog stacks below the sheet's z-index.
  const handleLogout = async () => {
    close();
    const ok = await confirm({
      title: "Log out?",
      description: "You'll need to sign in again on this device.",
      confirmText: "Log out",
      destructive: true,
    });
    if (ok) onLogout();
  };

  return (
    <>
      <header className="grid h-14 shrink-0 grid-cols-[3rem_1fr_3rem] items-center border-b border-border px-1">
        <DialogClose
          aria-label="Close menu"
          className="flex size-11 items-center justify-center rounded-full text-foreground transition-colors active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="size-7" strokeWidth={1.75} aria-hidden="true" />
        </DialogClose>
        <DialogTitle className="truncate text-center text-base font-semibold text-foreground">
          Menu
        </DialogTitle>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="relative px-4 pt-3 pb-2">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-7 z-10 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search menu"
            enterKeyHint="search"
            className="bg-muted pl-9"
          />
        </div>

        {showProfile && (
          <section aria-labelledby="menu-account">
            <SectionHeading id="menu-account">Your account</SectionHeading>
            <NavLink
              to="/profile"
              onClick={close}
              className="mx-4 flex items-center gap-3 rounded-2xl border border-border p-3 transition-colors active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar name={name} className="h-12 w-12 min-w-12 text-lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-foreground">{name}</span>
                <span className="block truncate text-[13px] text-muted-foreground">
                  {user.email || "Profile, personal details and password"}
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </NavLink>
          </section>
        )}

        {sections.map((section, i) => {
          const headingId = `menu-section-${i}`;
          return (
            <section key={section.title} aria-labelledby={headingId}>
              {(showProfile || i > 0) && <SectionDivider />}
              <SectionHeading id={headingId}>{section.title}</SectionHeading>
              <ul>
                {section.items.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      onClick={close}
                      className={({ isActive }) =>
                        cn(
                          "flex min-h-13 items-center gap-4 px-4 py-3 text-foreground transition-colors active:bg-muted",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                          isActive && "font-semibold",
                        )
                      }
                    >
                      <span className={ROW_ICON} aria-hidden="true">{item.icon}</span>
                      <span className="flex-1 truncate text-[15px]">{item.label}</span>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </NavLink>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {showLogout && (
          <section aria-labelledby="menu-login">
            {(showProfile || sections.length > 0) && <SectionDivider />}
            <SectionHeading id="menu-login">Login</SectionHeading>
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-13 w-full items-center px-4 py-3 text-left text-[15px] text-destructive transition-colors active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              Log out
            </button>
          </section>
        )}

        {nothingFound && (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground" role="status">
            No results for “{query.trim()}”
          </p>
        )}

        <div className="h-6" aria-hidden="true" />
      </div>
    </>
  );
}

function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="px-4 pt-4 pb-2 text-[13px] font-semibold text-muted-foreground">
      {children}
    </h2>
  );
}

function SectionDivider() {
  return <div aria-hidden="true" className="mt-3 h-2 bg-muted" />;
}
