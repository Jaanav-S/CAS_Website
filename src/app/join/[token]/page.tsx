import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { googleConfigured } from "@/lib/google";
import { findClaimable } from "@/lib/invites";
import { ROLE_LABELS } from "@/lib/constants";
import { AuthCard, GoogleButton } from "@/components/AuthCard";

export const metadata = { title: "Join" };

const ERRORS: Record<string, string> = {
  "invite-full": "Somebody took the last place on this link just before you.",
  "invite-revoked": "This link has been turned off by your school.",
  "invite-unknown": "That link is not valid.",
  "google-cancelled": "Google sign-in was cancelled.",
  "google-state": "That sign-in link expired. Please try again.",
  "google-failed": "Google sign-in failed. Please try again.",
  "google-unverified": "That Google account does not have a verified email address.",
};

const DEAD: Record<string, string> = {
  unknown: "This link is not valid. Check you copied all of it, or ask for a new one.",
  full: "Everybody expected on this link has already signed up, so it is closed.",
  revoked: "Your school has turned this link off.",
};

export default async function JoinPage(props: PageProps<"/join/[token]">) {
  // Already signed in? Nothing to join.
  if (await getSession()) redirect("/");

  const { token } = await props.params;
  const params = await props.searchParams;
  const errorKey = typeof params.error === "string" ? params.error : null;

  const found = await findClaimable(token);

  if (!found.ok) {
    return (
      <AuthCard title="This link cannot be used" subtitle="Sign-up link">
        <p className="text-sm leading-relaxed text-muted">{DEAD[found.reason]}</p>
        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm font-semibold text-brand hover:underline">
            Already have an account? Sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  const { invite } = found;

  return (
    <AuthCard
      title="Join the CAS portal"
      subtitle={invite.label || "You have been invited"}
    >
      {errorKey && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {ERRORS[errorKey] ?? "Something went wrong. Please try again."}
        </p>
      )}

      <dl className="mb-5 space-y-2 rounded-lg border bg-surface-2 p-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">You will join as</dt>
          <dd className="font-semibold">{ROLE_LABELS[invite.role]}</dd>
        </div>
        {invite.sectionName && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Section</dt>
            <dd className="font-semibold">{invite.sectionName}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Places left</dt>
          <dd className="font-semibold">{invite.left}</dd>
        </div>
      </dl>

      {googleConfigured() ? (
        <GoogleButton label="Sign up with Google" invite={token} />
      ) : (
        <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          Google sign-in has not been configured on this server yet.
        </p>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        Use your school Google account. Your place is taken the moment you sign
        in.
      </p>
    </AuthCard>
  );
}
