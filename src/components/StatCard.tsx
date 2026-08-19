import Link from "next/link";

type Tone = "neutral" | "brand" | "accent" | "danger" | "info";

const TONES: Record<Tone, string> = {
  neutral: "var(--foreground)",
  brand: "var(--brand)",
  accent: "var(--accent)",
  danger: "var(--danger)",
  info: "var(--info)",
};

export function StatCard({
  label,
  value,
  tone = "neutral",
  hint,
  href,
}: {
  label: string;
  value: number | string;
  tone?: Tone;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="hint font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-3xl font-bold" style={{ color: TONES[tone] }}>
        {value}
      </p>
      {hint && <p className="hint mt-1">{hint}</p>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
        {body}
      </Link>
    );
  }
  return <div className="card p-5">{body}</div>;
}
