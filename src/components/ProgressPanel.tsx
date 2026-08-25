import { LEARNING_OUTCOMES, REQUIREMENTS, STRANDS } from "@/lib/constants";
import type { Progress } from "@/lib/progress";

const STRAND_META: Record<string, { blurb: string; tint: string }> = {
  Creativity: { blurb: "Arts and creative thinking", tint: "var(--info)" },
  Activity: { blurb: "Physical exertion", tint: "var(--brand)" },
  Service: { blurb: "Unpaid, voluntary exchange", tint: "var(--accent)" },
};

export function ProgressPanel({
  progress,
  pendingCount = 0,
}: {
  progress: Progress;
  pendingCount?: number;
}) {
  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div className="flex flex-wrap items-center gap-6">
          <Ring percent={progress.percent} />
          <div className="min-w-56 flex-1">
            <h2 className="text-lg font-bold">
              {progress.complete
                ? "All CAS requirements met 🎉"
                : "Your CAS progress"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {progress.approvedCount} of {progress.totalRequired} approved
              experiences
              {pendingCount > 0 && ` · ${pendingCount} awaiting review`}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Check label={`${REQUIREMENTS.totalExperiences} experiences`} met={progress.totalMet} />
              <Check label="All three baskets" met={progress.strandsMet} />
              <Check
                label={`Each LO ×${REQUIREMENTS.perLearningOutcome}`}
                met={progress.outcomesMet}
              />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          The three baskets
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {STRANDS.map((strand) => {
            const count = progress.strandCounts[strand] ?? 0;
            const met = count >= REQUIREMENTS.perStrand;
            return (
              <div key={strand} className="card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold">{strand}</p>
                    <p className="hint mt-0.5">{STRAND_META[strand].blurb}</p>
                  </div>
                  <span className={`badge ${met ? "badge-approved" : "badge-neutral"}`}>
                    {met ? "Met" : "Open"}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold" style={{ color: STRAND_META[strand].tint }}>
                  {count}
                </p>
                <p className="hint">
                  approved experience{count === 1 ? "" : "s"} · minimum{" "}
                  {REQUIREMENTS.perStrand}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          Learning outcomes · each needs {REQUIREMENTS.perLearningOutcome} approved
          experiences
        </h3>
        <div className="card divide-y">
          {LEARNING_OUTCOMES.map((lo) => {
            const count = progress.loCounts[lo.id] ?? 0;
            const met = count >= REQUIREMENTS.perLearningOutcome;
            return (
              <div key={lo.id} className="flex items-center gap-4 px-5 py-3">
                <span className="w-10 shrink-0 text-sm font-bold">{lo.id}</span>
                <span className="flex-1 text-sm">{lo.label}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="flex gap-1" aria-hidden>
                    {Array.from({ length: REQUIREMENTS.perLearningOutcome }).map(
                      (_, i) => (
                        <span
                          key={i}
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            background:
                              i < count ? "var(--brand)" : "var(--surface-2)",
                            border: "1px solid var(--border)",
                          }}
                        />
                      ),
                    )}
                  </span>
                  <span
                    className={`w-12 text-right text-sm font-semibold ${
                      met ? "text-brand" : "text-muted"
                    }`}
                  >
                    {count}/{REQUIREMENTS.perLearningOutcome}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Ring({ percent }: { percent: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(percent, 100) / 100) * circumference;

  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth="10"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xl font-bold">
        {percent}%
      </span>
    </div>
  );
}

function Check({ label, met }: { label: string; met: boolean }) {
  return (
    <span
      className={`badge ${met ? "badge-approved" : "badge-neutral"} justify-start`}
    >
      <span aria-hidden>{met ? "✓" : "○"}</span>
      {label}
    </span>
  );
}
