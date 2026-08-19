import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Experience } from "@/models/Experience";
import { plain } from "@/lib/serialize";
import { STRANDS } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Discovery" };

type FeedItem = {
  _id: string;
  title: string;
  blogTitle?: string;
  blogBody?: string;
  headerImage?: string;
  strands: string[];
  reviewedAt?: string;
  submittedAt?: string;
  student: { _id: string; name: string; image?: string };
};

export default async function DiscoveryPage(props: PageProps<"/discovery">) {
  await requireUser();

  const params = await props.searchParams;
  const strand = typeof params.strand === "string" ? params.strand : null;

  await dbConnect();
  const query: Record<string, unknown> = { status: "approved" };
  if (strand && STRANDS.includes(strand as never)) query.strands = strand;

  const docs = await Experience.find(query)
    .select("title blogTitle blogBody headerImage strands reviewedAt submittedAt student")
    .populate("student", "name image")
    .sort({ reviewedAt: -1 })
    .limit(60)
    .lean();

  const feed = plain(docs as unknown as FeedItem[]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Discovery</h1>
        <p className="mt-1 text-sm text-muted">
          Approved CAS reflections from across the school. Read what everyone
          else has been up to.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip label="Everything" href="/discovery" active={!strand} />
        {STRANDS.map((item) => (
          <FilterChip
            key={item}
            label={item}
            href={`/discovery?strand=${item}`}
            active={strand === item}
          />
        ))}
      </div>

      {feed.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-semibold">No reflections published yet</p>
          <p className="mt-1 text-sm text-muted">
            Reflections appear here once a teacher approves them.
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
                    {item.student.name} · {formatDate(item.reviewedAt ?? item.submittedAt)}
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

function FilterChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`badge ${active ? "badge-approved" : "badge-neutral"} px-3 py-1.5`}
    >
      {label}
    </Link>
  );
}
