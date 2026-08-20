import Image from "next/image";
import Link from "next/link";
import mongoose from "mongoose";
import { requireRole } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Experience } from "@/models/Experience";
import { Section } from "@/models/Section";
import { teacherSectionIds } from "@/lib/scope";
import { plain } from "@/lib/serialize";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import type { ReviewStatus } from "@/lib/constants";

export const metadata = { title: "Review queue" };

type QueueItem = {
  _id: string;
  title: string;
  blogTitle?: string;
  headerImage?: string;
  strands: string[];
  status: ReviewStatus;
  submittedAt?: string;
  student: { _id: string; name: string };
  section?: { name: string; year: string } | null;
};

const TABS: { key: string; label: string }[] = [
  { key: "pending", label: "Awaiting review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Sent back" },
];

export default async function ReviewQueuePage(
  props: PageProps<"/teacher/review">,
) {
  const user = await requireRole("teacher", "supervisor", "admin");

  await dbConnect();
  const sectionIds =
    user.role !== "teacher"
      ? (
          await Section.find().select("_id").lean<{ _id: mongoose.Types.ObjectId }[]>()
        ).map((s) => s._id)
      : await teacherSectionIds(user.id);

  const params = await props.searchParams;
  const status =
    typeof params.status === "string" &&
    TABS.some((t) => t.key === params.status)
      ? params.status
      : "pending";

  const docs = await Experience.find({
    section: { $in: sectionIds },
    status: status as ReviewStatus,
  })
    .select("title blogTitle headerImage strands status submittedAt student section")
    .populate("student", "name")
    .populate("section", "name year")
    .sort(status === "pending" ? { submittedAt: 1 } : { reviewedAt: -1 })
    .limit(100)
    .lean();

  const items = plain(docs as unknown as QueueItem[]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Review queue</h1>
        <p className="mt-1 text-sm text-muted">
          Reflections submitted by students in your section
          {user.role === "admin" ? "s (all sections, as an admin)" : ""}.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b pb-px">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/teacher/review?status=${tab.key}`}
            className={`-mb-px rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition ${
              status === tab.key
                ? "border-brand text-brand-strong"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-semibold">
            {status === "pending" ? "Nothing to review right now" : "Nothing here"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {status === "pending"
              ? "New submissions from your students will show up here."
              : "Try another tab."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item._id}>
              <Link
                href={`/teacher/review/${item._id}`}
                className="card flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <span className="relative hidden h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-2 sm:block">
                  {item.headerImage && (
                    <Image
                      src={item.headerImage}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {item.blogTitle || item.title}
                    </span>
                    <StatusBadge status={item.status} />
                  </span>
                  <span className="hint mt-0.5 block truncate">
                    {item.student.name}
                    {item.section && ` · ${item.section.name} ${item.section.year}`}
                    {item.submittedAt && ` · submitted ${formatDateTime(item.submittedAt)}`}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {item.strands.map((s) => (
                      <span key={s} className="badge badge-info">
                        {s}
                      </span>
                    ))}
                  </span>
                </span>

                <span className="btn btn-ghost btn-sm hidden sm:inline-flex">
                  Open
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
