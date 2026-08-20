import { User } from "@/models/User";

/**
 * The one account that may sign in without an invite link: the bootstrap
 * admin, named in BOOTSTRAP_ADMIN_EMAIL. Without it there would be nobody able
 * to create the first invite.
 */
export async function isBootstrapAdmin(email: string): Promise<boolean> {
  const configured = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase().trim();
  if (configured && configured === email.toLowerCase()) return true;
  // An empty database also lets the very first person in, as the admin.
  return (await User.estimatedDocumentCount()) === 0;
}
