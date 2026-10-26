import { SDGS } from "@/lib/constants";

/** The 17 UN Sustainable Development Goals in their official colours. */
const COLORS = [
  "#e5243b", "#dda63a", "#4c9f38", "#c5192d", "#ff3a21", "#26bde2",
  "#fcc30b", "#a21942", "#fd6925", "#dd1367", "#fd9d24", "#bf8b2e",
  "#3f7e44", "#0a97d9", "#56c02b", "#00689d", "#19486a",
];

export function SdgGrid({ selected = [] }: { selected?: number[] }) {
  return (
    <div>
      <div className="grid grid-cols-6 gap-1">
        {SDGS.map((goal) => {
          const on = selected.includes(goal.id);
          const color = COLORS[goal.id - 1];
          // Anchor the card inward on the edge columns so it never runs off
          // screen; centre it for the middle ones.
          const col = (goal.id - 1) % 6;
          const anchor =
            col <= 1
              ? "left-0"
              : col >= 4
                ? "right-0"
                : "left-1/2 -translate-x-1/2";
          return (
            <div key={goal.id} className="group relative">
              <span
                tabIndex={0}
                aria-label={`Goal ${goal.id}: ${goal.label}. ${goal.blurb}`}
                className="grid aspect-square cursor-help place-items-center rounded text-xs font-bold text-white outline-none transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
                style={{
                  background: color,
                  opacity: selected.length === 0 || on ? 1 : 0.25,
                }}
              >
                {goal.id}
              </span>

              {/* Hover / focus card with the goal's name and a short description. */}
              <div
                role="tooltip"
                className={`pointer-events-none absolute bottom-full z-40 mb-1.5 hidden w-48 rounded-lg border bg-surface p-2.5 text-left shadow-lg group-hover:block group-focus-within:block ${anchor}`}
              >
                <p className="text-xs font-bold leading-snug">
                  <span style={{ color }}>{goal.id}.</span> {goal.label}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-muted">
                  {goal.blurb}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <a
        href="https://sdgs.un.org/goals"
        target="_blank"
        rel="noreferrer"
        className="hint mt-1 inline-block text-info hover:underline"
      >
        Source: UN Sustainable Development Goals
      </a>
    </div>
  );
}
