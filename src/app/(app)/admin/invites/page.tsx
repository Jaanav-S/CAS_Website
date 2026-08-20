import { headers } from "next/headers";
import { requireRole, isAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Section } from "@/models/Section";
import { allInvites } from "@/lib/invites";
import { CreateInvite, type SectionOption } from "./CreateInvite";
import { InviteList } from "@/components/InviteList";

export const metadata = { title: "Sign-up links" };

/** Links have to be absolute to be pasted into an email, so build them from the request. */
async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function AdminInvitesPage() {
  const user = await requireRole("admin");
  await dbConnect();

  const base = await origin();
  const [invites, sectionDocs] = await Promise.all([
    allInvites(base),
    Section.find()
      .select("name year dpYear")
      .sort({ dpYear: 1, year: -1, name: 1 })
      .lean<{ _id: unknown; name: string; year: string; dpYear: string }[]>(),
  ]);

  const sections: SectionOption[] = sectionDocs.map((s) => ({
    id: String(s._id),
    label: `${s.name} · ${s.year} (${s.dpYear})`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sign-up links</h1>
        <p className="mt-1 text-sm text-muted">
          The only way to join. Anyone opening a link signs in with Google and
          lands in the right role and section automatically.
        </p>
      </div>

      <CreateInvite sections={sections} canInviteCoordinator={isAdmin(user)} />

      <InviteList invites={invites} canManage />
    </div>
  );
}
