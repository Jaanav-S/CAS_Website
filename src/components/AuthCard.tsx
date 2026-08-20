import { SCHOOL_NAME } from "@/lib/constants";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span
            aria-hidden
            className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-brand text-sm font-bold tracking-wide text-white"
          >
            FS
          </span>
          <p className="mb-1 text-sm font-semibold text-brand">{SCHOOL_NAME}</p>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        <div className="card p-6">{children}</div>
      </div>
    </div>
  );
}

export function GoogleButton({
  label,
  invite,
}: {
  label: string;
  /** Passed on so the callback knows which link they arrived through. */
  invite?: string;
}) {
  const href = invite
    ? `/api/auth/google?invite=${encodeURIComponent(invite)}`
    : "/api/auth/google";

  return (
    <a href={href} className="btn btn-ghost w-full">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
        <path
          fill="#4285F4"
          d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"
        />
      </svg>
      {label}
    </a>
  );
}
