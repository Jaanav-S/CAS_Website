import Image from "next/image";
import Link from "next/link";
import type { ExperienceListItem } from "@/lib/queries";
import { StatusBadge } from "@/components/StatusBadge";
import { formatRange } from "@/lib/format";

export function ExperienceCard({
  experience,
  href,
  showStatus = true,
}: {
  experience: ExperienceListItem;
  /** Omit to render a plain card (e.g. another student's unsubmitted draft). */
  href?: string;
  showStatus?: boolean;
}) {
  const content = (
    <>
      <div className="relative h-36 w-full bg-surface-2">
        {experience.headerImage ? (
          <Image
            src={experience.headerImage}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="grid h-full place-items-center text-sm text-muted">
            No header image yet
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap gap-1.5">
          {experience.strands.map((strand) => (
            <span key={strand} className="badge badge-info">
              {strand}
            </span>
          ))}
          {showStatus && <StatusBadge status={experience.status} />}
        </div>

        <h3 className="font-bold leading-snug group-hover:text-brand">
          {experience.title}
        </h3>

        <p className="hint mt-auto">
          {experience.term} · {experience.year} ·{" "}
          {formatRange(experience.fromDate, experience.toDate)}
        </p>

        <p className="hint">{experience.learningOutcomes.join(", ")}</p>
      </div>
    </>
  );

  if (!href) {
    return <div className="card flex flex-col overflow-hidden">{content}</div>;
  }

  return (
    <Link
      href={href}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      {content}
    </Link>
  );
}
