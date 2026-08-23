import Link from "next/link";
import { requireRole, isAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { Section } from "@/models/Section";
import { plain } from "@/lib/serialize";
import { ACCOUNT_STATUSES, ROLES, ROLE_LABELS } from "@/lib/constants";
import { UserRow, type AdminUser, type SectionOption } from "./UserRow";

export const metadata = { title: "Users" };

export default async function AdminUsersPage(props: PageProps<"/admin/users">) {
  const admin = await requireRole("admin");
  const viewerIsAdmin = isAdmin(admin);
  const params = await props.searchParams;

  const status = typeof params.status === "string" ? params.status : null;
  const role = typeof params.role === "string" ? params.role : null;
  const graduated = typeof params.graduated === "string" ? params.graduated : null;

  await dbConnect();
  const query: Record<string, unknown> = {};
  if (status && ACCOUNT_STATUSES.includes(status as never)) query.status = status;
  if (role && ROLES.includes(role as never)) query.role = role;
  if (graduated === "yes") query.graduated = true;
  if (graduated === "no") query.graduated = { $ne: true };

  const [userDocs, sectionDocs] = await Promise.all([
    User.find(query)
      .select("name email image role status section graduated graduationYear createdAt")
      .sort({ status: 1, createdAt: -1 })
      .limit(500)
      .lean(),
    Section.find()
      .select("name year dpYear gradYear")
      .sort({ gradYear: -1, name: 1 })
      .lean(),
  ]);

  const users = plain(userDocs as unknown as AdminUser[]);
  const sections = plain(sectionDocs as unknown as SectionOption[]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="mt-1 text-sm text-muted">
          Approve new accounts, set roles and put people into sections.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <FilterGroup
          label="Status"
          base="/admin/users"
          param="status"
          current={status}
          other={[role ? `role=${role}` : "", graduated ? `graduated=${graduated}` : ""]
            .filter(Boolean)
            .join("&")}
          options={[...ACCOUNT_STATUSES]}
        />
        <FilterGroup
          label="Role"
          base="/admin/users"
          param="role"
          current={role}
          other={[status ? `status=${status}` : "", graduated ? `graduated=${graduated}` : ""]
            .filter(Boolean)
            .join("&")}
          options={[...ROLES]}
          labels={ROLE_LABELS}
        />
        <FilterGroup
          label="Graduated"
          base="/admin/users"
          param="graduated"
          current={graduated}
          other={[status ? `status=${status}` : "", role ? `role=${role}` : ""]
            .filter(Boolean)
            .join("&")}
          options={["yes", "no"]}
        />
      </div>

      {users.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">
          No users match this filter.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-semibold">Person</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Section</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <UserRow
                  key={user._id}
                  user={user}
                  sections={sections}
                  isSelf={user._id === admin.id}
                  viewerIsAdmin={viewerIsAdmin}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  base,
  param,
  current,
  other,
  options,
  labels,
}: {
  label: string;
  base: string;
  param: string;
  current: string | null;
  other: string;
  options: string[];
  labels?: Record<string, string>;
}) {
  const href = (value: string | null) => {
    const parts = [other, value ? `${param}=${value}` : ""].filter(Boolean);
    return parts.length ? `${base}?${parts.join("&")}` : base;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="hint font-semibold uppercase tracking-wide">{label}</span>
      <Link
        href={href(null)}
        className={`badge px-3 py-1.5 ${!current ? "badge-approved" : "badge-neutral"}`}
      >
        Any
      </Link>
      {options.map((option) => (
        <Link
          key={option}
          href={href(option)}
          className={`badge px-3 py-1.5 capitalize ${
            current === option ? "badge-approved" : "badge-neutral"
          }`}
        >
          {labels?.[option] ?? option}
        </Link>
      ))}
    </div>
  );
}
