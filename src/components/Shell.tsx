import Link from "next/link";
import type { SessionUser } from "@/lib/auth";
import { ROLE_LABELS, SCHOOL_NAME } from "@/lib/constants";
import { LogoutButton, NavLinks, type NavItem } from "@/components/Nav";

const NAV: Record<SessionUser["role"], NavItem[]> = {
  student: [
    { href: "/dashboard", label: "Home" },
    { href: "/my-cas", label: "My CAS" },
    { href: "/discovery", label: "Discovery" },
  ],
  teacher: [
    { href: "/teacher", label: "Class overview" },
    { href: "/teacher/review", label: "Review queue" },
    { href: "/teacher/projects", label: "CAS projects" },
    { href: "/discovery", label: "Discovery" },
  ],
  supervisor: [
    { href: "/supervisor", label: "Overview" },
    { href: "/supervisor/projects", label: "CAS projects" },
    { href: "/discovery", label: "Discovery" },
  ],
  admin: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/projects", label: "CAS projects" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/sections", label: "Sections" },
    { href: "/discovery", label: "Discovery" },
  ],
};

export function Shell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-surface/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-xs font-bold tracking-wide text-white"
            >
              FS
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block font-serif text-base font-semibold">
                {SCHOOL_NAME}
              </span>
              <span className="block text-xs text-muted">CAS Portal</span>
            </span>
          </Link>

          <NavLinks items={NAV[user.role]} />

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight">{user.name}</p>
              <p className="text-xs text-muted">{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
