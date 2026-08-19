import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { googleConfigured } from "@/lib/google";
import { AuthCard, GoogleButton } from "@/components/AuthCard";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  "google-not-configured":
    "Google sign-in is not set up yet. Use your email and password, or ask an admin to add the Google credentials.",
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
    <AuthCard title="Welcome back" subtitle="Sign in to your CAS portal">
      {errorKey && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {ERRORS[errorKey] ?? "Something went wrong. Please try again."}
        </p>
      )}

      <LoginForm />

      {googleConfigured() && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-muted">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
          <GoogleButton label="Continue with Google" />
        </>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        No account yet?{" "}
        <Link href="/signup" className="font-semibold text-brand hover:underline">
          Create one
        </Link>
      </p>
    </AuthCard>
  );
}
