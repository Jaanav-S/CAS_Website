import { formatDateTime } from "@/lib/format";

export type Note = {
  _id?: string;
  teacherName: string;
  action: "approved" | "rejected" | "takedown";
  comment: string;
  createdAt: string | Date;
};

export function ReviewTimeline({ notes }: { notes: Note[] }) {
  if (notes.length === 0) return null;

  return (
    <div className="card p-6">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
        Teacher feedback
      </h2>
      <ol className="mt-4 space-y-4">
        {[...notes].reverse().map((note, i) => (
          <li key={note._id ?? i} className="flex gap-3">
            <span
              aria-hidden
              className={`mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${
                note.action === "approved"
                  ? "bg-brand-soft text-brand-strong"
                  : "bg-danger-soft text-danger"
              }`}
            >
              {note.action === "approved" ? "✓" : note.action === "takedown" ? "⤺" : "!"}
            </span>
            <div className="min-w-0">
              <p className="text-sm">
                <span className="font-semibold">{note.teacherName}</span>{" "}
                <span className="text-muted">
                  {note.action === "approved"
                    ? "approved this"
                    : note.action === "takedown"
                      ? "removed this from Discovery"
                      : "asked for changes"}{" "}
                  · {formatDateTime(note.createdAt)}
                </span>
              </p>
              {note.comment && (
                <p className="mt-1 whitespace-pre-line rounded-lg bg-surface-2 px-3 py-2 text-sm">
                  {note.comment}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
