import { requireRole, isAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Section } from "@/models/Section";
import { allInvites } from "@/lib/invites";
import { appOrigin } from "@/lib/appUrl";
import { sectionLabel, sectionGradYear } from "@/lib/cohort";
import { CreateInvite, type SectionOption } from "./CreateInvite";
import { InviteList } from "@/components/InviteList";

export const metadata = { title: "Sign-up links" };

export default async function AdminInvitesPage() {
  const user = await requireRole("admin");
  await dbConnect();

  const base = await appOrigin();
  const [invites, sectionDocs] = await Promise.all([
    allInvites(base),
    Section.find()
      .select("name year dpYear gradYear")
      .lean<
        {
          _id: unknown;
          name: string;
          year?: string;
          dpYear?: string;
          gradYear?: number;
        }[]
      >(),
  ]);

  const sections: SectionOption[] = sectionDocs
    .sort((a, b) => sectionGradYear(b) - sectionGradYear(a) || a.name.localeCompare(b.name))
    .map((s) => ({
      id: String(s._id),
      label: sectionLabel(s),
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
