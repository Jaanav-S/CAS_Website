import { User } from "@/models/User";

/**
 * Decides the role/status a brand-new account starts with.
 * Everyone lands in "pending" until an admin approves them, except the
 * bootstrap admin — otherwise there would be nobody able to approve anyone.
 */
export async function initialAccess(email: string): Promise<{
  role: "admin" | "student";
  status: "approved" | "pending";
}> {
  const bootstrap = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase().trim();
  if (bootstrap && bootstrap === email.toLowerCase()) {
    return { role: "admin", status: "approved" };
  }
  // First account ever created also bootstraps the system.
  if ((await User.estimatedDocumentCount()) === 0) {
    return { role: "admin", status: "approved" };
  }
  return { role: "student", status: "pending" };
}
