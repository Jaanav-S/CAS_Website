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
          return (
            <span
              key={goal.id}
              title={`${goal.id}. ${goal.label}`}
              className="grid aspect-square place-items-center rounded text-xs font-bold text-white transition"
              style={{
                background: COLORS[goal.id - 1],
                opacity: selected.length === 0 || on ? 1 : 0.25,
              }}
            >
              {goal.id}
            </span>
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
