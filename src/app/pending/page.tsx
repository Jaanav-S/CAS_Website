import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthCard } from "@/components/AuthCard";
import { LogoutButton } from "@/components/Nav";

export const metadata = { title: "Awaiting approval" };

export default async function PendingPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.status === "approved") redirect("/");

  const rejected = user.status === "rejected";

  return (
    <AuthCard
      title={rejected ? "Account not approved" : "Almost there"}
      subtitle={user.email}
    >
      <p className="text-sm leading-relaxed text-muted">
        {rejected
          ? "An administrator did not approve this account. Please speak to your CAS coordinator if you think this is a mistake."
          : "Your account has been created and is waiting for an administrator to approve it and add you to a section. You will get access as soon as that happens — try signing in again later."}
      </p>

      {rejected && user.rejectionReason && (
        <p className="mt-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {user.rejectionReason}
        </p>
      )}

      <div className="mt-6 flex justify-center">
        <LogoutButton />
      </div>
    </AuthCard>
  );
}
