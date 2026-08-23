/**
 * A user's Google profile picture, with a coloured initial as the fallback for
 * accounts that have no photo. `referrerPolicy="no-referrer"` is required —
 * Google's image host (lh3.googleusercontent.com) returns 403 if a Referer is
 * sent.
 */
export function Avatar({
  name,
  image,
  size = 40,
  className = "",
}: {
  name: string;
  image?: string | null;
  size?: number;
  className?: string;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className={`shrink-0 rounded-full border border-line object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-brand-soft font-bold text-brand-strong ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
