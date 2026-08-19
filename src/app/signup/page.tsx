import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { googleConfigured } from "@/lib/google";
import { AuthCard, GoogleButton } from "@/components/AuthCard";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "Create account" };

export default async function SignupPage() {
  if (await getSession()) redirect("/");

  return (
    <AuthCard
      title="Create your account"
      subtitle="An admin approves new accounts before you can start"
    >
      <SignupForm />

      {googleConfigured() && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-muted">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
          <GoogleButton label="Sign up with Google" />
        </>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
