import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { studentExperiences } from "@/lib/queries";
import { ExperienceCard } from "@/components/ExperienceCard";
import type { ReviewStatus } from "@/lib/constants";

export const metadata = { title: "My CAS" };

const TABS: { key: ReviewStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Needs changes" },
];

export default async function MyCasPage(props: PageProps<"/my-cas">) {
  const user = await requireUser();
  if (user.role !== "student") redirect("/");

  const params = await props.searchParams;
  const tab = typeof params.tab === "string" ? params.tab : "all";
  const banner =
    params.submitted === "1"
      ? "Submitted for review. Your teacher will look at it shortly."
      : params.saved === "1"
        ? "Saved as a draft. Submit it when you are ready."
        : null;

  const experiences = await studentExperiences(user.id);
  const counts = experiences.reduce<Record<string, number>>((acc, exp) => {
    acc[exp.status] = (acc[exp.status] ?? 0) + 1;
    return acc;
  }, {});

  const visible =
    tab === "all" ? experiences : experiences.filter((e) => e.status === tab);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My CAS</h1>
          <p className="mt-1 text-sm text-muted">
            Every experience you have proposed, and where it is in review.
          </p>
        </div>
        <Link href="/experiences/new" className="btn btn-primary">
          + New CAS experience
        </Link>
      </div>

      {banner && (
        <p className="rounded-lg border border-brand/30 bg-brand-soft px-3 py-2 text-sm text-brand-strong">
          {banner}
        </p>
      )}

      <div className="flex flex-wrap gap-1 border-b pb-px">
        {TABS.map((item) => {
          const active = tab === item.key;
          const count =
            item.key === "all" ? experiences.length : (counts[item.key] ?? 0);
          return (
            <Link
              key={item.key}
              href={item.key === "all" ? "/my-cas" : `/my-cas?tab=${item.key}`}
              className={`-mb-px rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition ${
                active
                  ? "border-brand text-brand-strong"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {item.label}
              <span className="ml-1.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-xs">
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-semibold">Nothing here yet</p>
          <p className="mt-1 text-sm text-muted">
            {tab === "all"
              ? "Propose your first CAS experience to get started."
              : "No experiences with this status."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((exp) => (
            <ExperienceCard
              key={String(exp._id)}
              experience={exp}
              href={`/experiences/${exp._id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
