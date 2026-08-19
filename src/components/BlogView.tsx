import Image from "next/image";
import { Markdown } from "@/components/Markdown";
import { formatDate } from "@/lib/format";

export type BlogViewProps = {
  headerImage?: string;
  headerWidth?: number | null;
  headerHeight?: number | null;
  blogTitle?: string;
  blogBody?: string;
  images?: string[];
  authorName: string;
  authorImage?: string;
  publishedAt?: string | Date | null;
  strands: string[];
};

export function BlogView({
  headerImage,
  headerWidth,
  headerHeight,
  blogTitle,
  blogBody,
  images = [],
  authorName,
  authorImage,
  publishedAt,
  strands,
}: BlogViewProps) {
  return (
    <article className="card overflow-hidden">
      {headerImage && (
        // The image keeps its own proportions, whatever shape it was uploaded
        // at, but never grows past a readable height on the page.
        <div className="flex w-full justify-center bg-surface-2">
          <Image
            src={headerImage}
            alt=""
            width={headerWidth ?? 1600}
            height={headerHeight ?? 900}
            sizes="(max-width: 768px) 100vw, 768px"
            className="max-h-[70vh] w-auto max-w-full object-contain"
            priority
            unoptimized
          />
        </div>
      )}

      <div className="p-6 sm:p-8">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {strands.map((strand) => (
            <span key={strand} className="badge badge-info">
              {strand}
            </span>
          ))}
        </div>

        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
          {blogTitle || "Untitled reflection"}
        </h1>

        <div className="mt-4 flex items-center gap-3 border-b pb-5">
          {authorImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={authorImage}
              alt=""
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand-strong">
              {authorName.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <p className="text-sm font-semibold">{authorName}</p>
            {publishedAt && (
              <p className="hint">{formatDate(publishedAt)}</p>
            )}
          </div>
        </div>

        <div className="mt-6">
          {blogBody ? (
            <Markdown text={blogBody} />
          ) : (
            <p className="text-sm italic text-muted">
              No reflection has been written yet.
            </p>
          )}
        </div>

        {images.length > 0 && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {images.map((url) => (
              <Image
                key={url}
                src={url}
                alt=""
                width={800}
                height={600}
                className="w-full rounded-lg border object-cover"
                unoptimized
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
