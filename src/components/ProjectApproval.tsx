"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * One approver's half of the decision. The other half is shown alongside so
 * they can see whether the project is already waiting on them alone.
 */
export function ProjectApproval({
  projectId,
  as,
  alreadyDecided,
  stage = "proposal",
}: {
  projectId: string;
  as: "teacher" | "supervisor";
  alreadyDecided: "pending" | "approved" | "rejected";
  /** "proposal" is the go-ahead to start, "completion" the sign-off to publish. */
  stage?: "proposal" | "completion";
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "rejecting">("idle");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(action: "approve" | "reject") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, stage, comment }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not save your decision.");
      setBusy(false);
      return;
    }
    router.refresh();
    setBusy(false);
    setMode("idle");
  }

  const who = as === "teacher" ? "the teacher" : "the CAS supervisor";
  const label =
    stage === "completion"
      ? `your sign-off as ${who} that the project is finished`
      : `your approval as ${who}`;

  if (alreadyDecided !== "pending") {
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold">
          You have already {alreadyDecided === "approved" ? "approved" : "sent back"} this
        </p>
        <p className="hint mt-1">
          {alreadyDecided === "approved"
            ? stage === "completion"
              ? "It needs the other approver too before it is published on Discovery."
              : "It needs the other approver too before the students can start their timeline."
            : stage === "completion"
              ? "The students will make your changes and send it back to you. The other approval stays as it is."
              : "The students can edit it and submit it again."}
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <p className="text-sm font-semibold">Waiting on {label}</p>

      {mode === "idle" ? (
        <div className="mt-3 space-y-2">
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={() => send("approve")}
            disabled={busy}
          >
            {busy
              ? "Saving…"
              : stage === "completion"
                ? "Sign off as finished"
                : "Approve project"}
          </button>
          <button
            type="button"
            className="btn btn-ghost w-full"
            onClick={() => setMode("rejecting")}
            disabled={busy}
          >
            Ask for changes
          </button>
          <p className="hint">
            {stage === "completion"
              ? "Once you and the other approver both agree, this is published on Discovery."
              : "A project needs both the teacher and the CAS supervisor before its timeline opens."}
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <label className="label" htmlFor={`pc-${projectId}`}>
            What needs to change?
          </label>
          <textarea
            id={`pc-${projectId}`}
            className="textarea"
            placeholder="The students see this and work from it."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-danger flex-1"
              onClick={() => send("reject")}
              disabled={busy || comment.trim().length < 5}
            >
              {busy ? "Sending…" : "Send back"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setMode("idle")}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}

/**
 * Supervisor shortcuts for reaching the students: Google Calendar prefilled
 * with them as guests, and Google Chat.
 */
export function ContactActions({
  calendarUrl,
  chatUrl,
  mailUrl,
}: {
  calendarUrl: string;
  chatUrl: string;
  mailUrl: string;
}) {
  return (
    <div className="card p-5">
      <p className="text-sm font-semibold">Get in touch</p>
      <div className="mt-3 space-y-2">
        <a
          href={calendarUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="btn btn-ghost w-full"
        >
          📅 Schedule a meeting
        </a>
        <a
          href={chatUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="btn btn-ghost w-full"
        >
          💬 Open Google Chat
        </a>
        <a
          href={mailUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="btn btn-ghost w-full"
        >
          ✉️ Email the group
        </a>
      </div>
      <p className="hint mt-2">
        Calendar and email open prefilled with every project member. Google does
        not allow linking straight to a chat with someone, so Chat opens at your
        conversation list.
      </p>
    </div>
  );
}
