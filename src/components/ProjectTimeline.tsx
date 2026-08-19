"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageUploader } from "@/components/ImageUploader";
import { formatDate } from "@/lib/format";

export type TimelineEntryView = {
  _id: string;
  date: string;
  description: string;
  image: string;
  imageWidth?: number | null;
  imageHeight?: number | null;
  addedBy: string;
  addedByName: string;
};

/**
 * The project's story after approval. Members add entries; teachers and the
 * CAS supervisor read them.
 */
export function ProjectTimeline({
  projectId,
  entries,
  canAdd,
  viewerId,
  locked,
  frozen = false,
  frozenReason,
}: {
  projectId: string;
  entries: TimelineEntryView[];
  canAdd: boolean;
  viewerId: string;
  /** True until both approvers have signed off on the proposal. */
  locked: boolean;
  /** Running, but temporarily closed: under completion review, or published. */
  frozen?: boolean;
  frozenReason?: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sorted = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  async function add() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/timeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        description,
        image: image ?? "",
        imageWidth: size?.width ?? null,
        imageHeight: size?.height ?? null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add that entry.");
      return;
    }
    setAdding(false);
    setDate("");
    setDescription("");
    setImage(null);
    setSize(null);
    router.refresh();
  }

  async function remove(entryId: string) {
    setBusy(true);
    await fetch(`/api/projects/${projectId}/timeline?entry=${entryId}`, {
      method: "DELETE",
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          Project timeline
        </h2>
        {canAdd && !locked && !adding && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setAdding(true)}
          >
            + Add to timeline
          </button>
        )}
      </div>

      {!locked && frozen && frozenReason && (
        <p className="rounded-lg border bg-surface-2 px-3 py-2 text-sm text-muted">
          {frozenReason}
        </p>
      )}

      {locked && (
        <div className="card p-6 text-center">
          <p className="font-semibold">The timeline is not open yet</p>
          <p className="mt-1 text-sm text-muted">
            It unlocks once your teacher and the CAS supervisor have both
            approved the project.
          </p>
        </div>
      )}

      {adding && (
        <div className="card space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
            <div>
              <label className="label" htmlFor="tl-date">
                Date <span className="text-danger">*</span>
              </label>
              <input
                id="tl-date"
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="tl-desc">
                What happened? <span className="text-danger">*</span>
              </label>
              <textarea
                id="tl-desc"
                className="textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <ImageUploader
            label="Photo"
            required
            preserveAspect
            hint="Every timeline entry needs one photo."
            value={image}
            onChange={(url, s) => {
              setImage(url);
              setSize(s ?? null);
            }}
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={add}
              disabled={busy || !date || description.trim().length < 10 || !image}
            >
              {busy ? "Adding…" : "Add entry"}
            </button>
          </div>
        </div>
      )}

      {!locked && sorted.length === 0 && !adding && (
        <div className="card p-8 text-center">
          <p className="font-semibold">Nothing on the timeline yet</p>
          <p className="mt-1 text-sm text-muted">
            {canAdd
              ? "Add your first entry as the project gets going."
              : "The students have not added anything yet."}
          </p>
        </div>
      )}

      {sorted.length > 0 && (
        <ol className="space-y-4">
          {sorted.map((entry) => (
            <li key={entry._id} className="card overflow-hidden">
              <div className="grid gap-0 sm:grid-cols-[16rem_1fr]">
                <div className="flex items-center justify-center bg-surface-2">
                  <Image
                    src={entry.image}
                    alt=""
                    width={entry.imageWidth ?? 800}
                    height={entry.imageHeight ?? 600}
                    className="max-h-56 w-auto max-w-full object-contain"
                    unoptimized
                  />
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge badge-info">{formatDate(entry.date)}</span>
                    <span className="hint">added by {entry.addedByName}</span>
                    {canAdd && entry.addedBy === viewerId && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm ml-auto"
                        onClick={() => remove(entry._id)}
                        disabled={busy}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
                    {entry.description}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
