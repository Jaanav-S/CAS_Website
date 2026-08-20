import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { googleConfigured } from "@/lib/google";
import { AuthCard, GoogleButton } from "@/components/AuthCard";

export const metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  "no-invite":
    "There is no account for that Google address yet. Signing up is by invitation — ask your CAS coordinator for your sign-up link.",
  "google-not-configured":
    "Google sign-in is not set up yet. Ask an admin to add the Google credentials.",
  "google-cancelled": "Google sign-in was cancelled.",
  "google-state": "That sign-in link expired. Please try again.",
  "google-failed": "Google sign-in failed. Please try again.",
  "google-unverified": "That Google account does not have a verified email address.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  if (await getSession()) redirect("/");

  const params = await props.searchParams;
  const errorKey = typeof params.error === "string" ? params.error : null;

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to the CAS portal">
      {errorKey && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {ERRORS[errorKey] ?? "Something went wrong. Please try again."}
        </p>
      )}

      {googleConfigured() ? (
        <GoogleButton label="Continue with Google" />
      ) : (
        <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          Google sign-in has not been configured on this server yet.
        </p>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        Accounts are created from an invitation link sent by your school. If you
        have not had one, ask your CAS coordinator.
      </p>
    </AuthCard>
  );
}
