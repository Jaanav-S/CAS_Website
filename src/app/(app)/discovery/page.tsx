import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Section } from "@/models/Section";
import { User } from "@/models/User";
import { plain } from "@/lib/serialize";
import { discoveryFeed, discoveryFilterOptions } from "@/lib/discovery";
import { sectionLabel, sectionGradYear } from "@/lib/cohort";
import { formatDate } from "@/lib/format";
import { DiscoveryFilters, type FilterOption } from "./DiscoveryFilters";

export const metadata = { title: "Discovery" };

export default async function DiscoveryPage(props: PageProps<"/discovery">) {
  await requireUser();
  const params = await props.searchParams;
  const one = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : null;

  await dbConnect();
  const { sectionIds, studentIds } = await discoveryFilterOptions();

  const [sectionDocs, studentDocs] = await Promise.all([
    Section.find({ _id: { $in: sectionIds } })
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
    User.find({ _id: { $in: studentIds } })
      .select("name")
      .sort({ name: 1 })
      .lean<{ _id: unknown; name: string }[]>(),
  ]);

  const sections: FilterOption[] = sectionDocs
    .sort((a, b) => sectionGradYear(b) - sectionGradYear(a) || a.name.localeCompare(b.name))
    .map((s) => ({
      value: String(s._id),
      label: sectionLabel(s),
    }));
  const students: FilterOption[] = studentDocs.map((s) => ({
    value: String(s._id),
    label: s.name,
  }));

  const filters = {
    kind: one("kind"),
    section: one("section"),
    student: one("student"),
    dpYear: one("dpYear"),
  };
  const feed = plain(await discoveryFeed(filters));
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Discovery</h1>
        <p className="mt-1 text-sm text-muted">
          Approved reflections and finished CAS projects from across the school.
        </p>
      </div>

      <Suspense fallback={<div className="card h-24" />}>
        <DiscoveryFilters sections={sections} students={students} />
      </Suspense>

      {feed.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-semibold">
            {filtered ? "Nothing matches those filters" : "Nothing published yet"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {filtered
              ? "Try widening the search."
              : "Reflections appear once a teacher approves them, and projects once they are finished and signed off."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {feed.map((item) => (
            <Link
              key={`${item.kind}-${item.id}`}
              href={item.href}
              className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="relative h-40 w-full bg-surface-2">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="grid h-full place-items-center text-sm text-muted">
                    No photo
                  </span>
                )}
                <span
                  className={`badge absolute left-2 top-2 ${
                    item.kind === "project" ? "badge-pending" : "badge-info"
                  }`}
                >
                  {item.kind === "project" ? "CAS project" : "Reflection"}
                </span>
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
                  {item.title}
                </h2>

                <p className="line-clamp-3 text-sm text-muted">{item.excerpt}</p>

                <div className="mt-auto flex items-center gap-2 pt-2">
                  <span className="flex -space-x-2">
                    {item.authors.slice(0, 3).map((a, i) =>
                      a.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={a.image}
                          alt=""
                          className="h-6 w-6 rounded-full border border-line object-cover"
                        />
                      ) : (
                        <span
                          key={i}
                          className="grid h-6 w-6 place-items-center rounded-full border border-line bg-brand-soft text-xs font-bold text-brand-strong"
                        >
                          {a.name.charAt(0).toUpperCase()}
                        </span>
                      ),
                    )}
                  </span>
                  <span className="hint truncate">
                    {item.authors.map((a) => a.name).join(", ")}
                    {item.sectionName && ` · ${item.sectionName}`} ·{" "}
                    {formatDate(item.publishedAt)}
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
