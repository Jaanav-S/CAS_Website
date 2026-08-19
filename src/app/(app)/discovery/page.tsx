import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Experience } from "@/models/Experience";
import { Section } from "@/models/Section";
import { User } from "@/models/User";
import { plain } from "@/lib/serialize";
import { DP_YEARS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { DiscoveryFilters, type FilterOption } from "./DiscoveryFilters";

export const metadata = { title: "Discovery" };

type FeedItem = {
  _id: string;
  title: string;
  blogTitle?: string;
  blogBody?: string;
  headerImage?: string;
  strands: string[];
  dpYear?: string | null;
  reviewedAt?: string;
  submittedAt?: string;
  student: { _id: string; name: string; image?: string };
  section?: { _id: string; name: string; year: string } | null;
};

const objectId = /^[0-9a-fA-F]{24}$/;

export default async function DiscoveryPage(props: PageProps<"/discovery">) {
  await requireUser();
  const params = await props.searchParams;

  const one = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : null;

  await dbConnect();

  // Only offer filter values that actually have something published behind
  // them, so the dropdowns never lead to an empty page.
  const [sectionIds, studentIds] = await Promise.all([
    Experience.distinct("section", { status: "approved" }),
    Experience.distinct("student", { status: "approved" }),
  ]);

  const [sectionDocs, studentDocs] = await Promise.all([
    Section.find({ _id: { $in: sectionIds.filter(Boolean) } })
      .select("name year dpYear")
      .sort({ dpYear: 1, year: -1, name: 1 })
      .lean<{ _id: unknown; name: string; year: string; dpYear: string }[]>(),
    User.find({ _id: { $in: studentIds } })
      .select("name")
      .sort({ name: 1 })
      .lean<{ _id: unknown; name: string }[]>(),
  ]);

  const sections: FilterOption[] = sectionDocs.map((s) => ({
    value: String(s._id),
    label: `${s.name} · ${s.year} (${s.dpYear})`,
  }));
  const students: FilterOption[] = studentDocs.map((s) => ({
    value: String(s._id),
    label: s.name,
  }));

  const query: Record<string, unknown> = { status: "approved" };
  const section = one("section");
  const student = one("student");
  const dpYear = one("dpYear");
  if (section && objectId.test(section)) query.section = section;
  if (student && objectId.test(student)) query.student = student;
  if (dpYear && DP_YEARS.includes(dpYear as never)) query.dpYear = dpYear;

  const docs = await Experience.find(query)
    .select(
      "title blogTitle blogBody headerImage strands dpYear reviewedAt submittedAt student section",
    )
    .populate("student", "name image")
    .populate("section", "name year")
    .sort({ reviewedAt: -1 })
    .limit(60)
    .lean();

  const feed = plain(docs as unknown as FeedItem[]);
  const filtered = Boolean(section || student || dpYear);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Discovery</h1>
        <p className="mt-1 text-sm text-muted">
          Approved CAS reflections from across the school. Read what everyone
          else has been up to.
        </p>
      </div>

      <Suspense fallback={<div className="card h-24" />}>
        <DiscoveryFilters sections={sections} students={students} />
      </Suspense>

      {feed.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-semibold">
            {filtered ? "Nothing matches those filters" : "No reflections published yet"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {filtered
              ? "Try widening the search."
              : "Reflections appear here once a teacher approves them."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {feed.map((item) => (
            <Link
              key={item._id}
              href={`/discovery/${item._id}`}
              className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="relative h-40 w-full bg-surface-2">
                {item.headerImage && (
                  <Image
                    src={item.headerImage}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                )}
              </div>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex flex-wrap gap-1.5">
                  {item.dpYear && (
                    <span className="badge badge-approved">{item.dpYear}</span>
                  )}
                  {item.strands.map((s) => (
                    <span key={s} className="badge badge-info">
                      {s}
                    </span>
                  ))}
                </div>

                <h2 className="font-bold leading-snug group-hover:text-brand">
                  {item.blogTitle || item.title}
                </h2>

                <p className="line-clamp-3 text-sm text-muted">
                  {(item.blogBody ?? "").replace(/[#*>-]/g, "").slice(0, 180)}
                </p>

                <div className="mt-auto flex items-center gap-2 pt-2">
                  {item.student.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.student.image}
                      alt=""
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand-strong">
                      {item.student.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="hint truncate">
                    {item.student.name}
                    {item.section && ` · ${item.section.name}`} ·{" "}
                    {formatDate(item.reviewedAt ?? item.submittedAt)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
