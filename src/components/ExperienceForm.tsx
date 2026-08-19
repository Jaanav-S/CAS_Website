"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  EXPERIENCE_STAGES,
  LEARNER_PROFILE,
  LEARNING_OUTCOMES,
  LOCATIONS,
  SDGS,
  STRANDS,
  TERMS,
} from "@/lib/constants";
import { MultiSelect } from "@/components/MultiSelect";
import { ImageUploader } from "@/components/ImageUploader";
import { SdgGrid } from "@/components/SdgGrid";
import { toDateInput } from "@/lib/format";
import {
  clearSnapshot,
  readSnapshot,
  renameSnapshot,
  storageKey,
  useAutosave,
  type SaveState,
} from "@/components/useAutosave";

export type Teacher = { id: string; name: string };

export type ExperienceFormValues = {
  year: string;
  term: string;
  title: string;
  description: string;
  strands: string[];
  location: string;
  fromDate: string;
  toDate: string;
  learningOutcomes: string[];
  sdgs: number[];
  investigation: string;
  learnerProfileAttributes: string[];
  learnerProfileNote: string;
  supervisor: string;
  casAdvisor: string;
  stage: string;
  blogTitle: string;
  blogBody: string;
  headerImage: string | null;
  headerWidth: number | null;
  headerHeight: number | null;
  images: string[];
};

type Props = {
  years: string[];
  teachers: Teacher[];
  /** Existing experience being edited, if any. */
  experienceId?: string;
  initial?: Partial<ExperienceFormValues>;
  /** Editing a rejected reflection usually wants to open straight on step 2. */
  startStep?: 1 | 2;
  /** When the server copy was last written, used to spot a newer local draft. */
  serverUpdatedAt?: string;
};

function emptyValues(years: string[]): ExperienceFormValues {
  return {
    year: years[1] ?? years[0] ?? "",
    term: TERMS[0],
    title: "",
    description: "",
    strands: [],
    location: LOCATIONS[0],
    fromDate: "",
    toDate: "",
    learningOutcomes: [],
    sdgs: [],
    investigation: "",
    learnerProfileAttributes: [],
    learnerProfileNote: "",
    supervisor: "",
    casAdvisor: "",
    stage: EXPERIENCE_STAGES[0],
    blogTitle: "",
    blogBody: "",
    headerImage: null,
    headerWidth: null,
    headerHeight: null,
    images: [],
  };
}

export function ExperienceForm({
  years,
  teachers,
  experienceId,
  initial,
  startStep = 1,
  serverUpdatedAt,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(startStep);
  const [id, setId] = useState<string | undefined>(experienceId);

  const serverValues: ExperienceFormValues = {
    ...emptyValues(years),
    ...initial,
    fromDate: toDateInput(initial?.fromDate),
    toDate: toDateInput(initial?.toDate),
  };

  const [values, setValues] = useState<ExperienceFormValues>(serverValues);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [restoredAt, setRestoredAt] = useState<Date | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function set<K extends keyof ExperienceFormValues>(
    key: K,
    value: ExperienceFormValues[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  // --- recovery -----------------------------------------------------------
  // localStorage can only be read on the client, so this runs once after
  // mount rather than in the initial state.
  const recovered = useRef(false);
  useEffect(() => {
    if (recovered.current) return;
    recovered.current = true;

    const snapshot = readSnapshot<ExperienceFormValues>(storageKey(experienceId));
    if (!snapshot) return;

    // Only take the local copy if it is newer than what the server holds —
    // otherwise a stale tab could resurrect old text.
    const serverTime = serverUpdatedAt ? new Date(serverUpdatedAt).getTime() : 0;
    if (snapshot.savedAt <= serverTime) {
      clearSnapshot(storageKey(experienceId));
      return;
    }

    // localStorage can only be read after mount, so restoring from it is
    // necessarily a post-mount state update. It runs exactly once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues({ ...serverValues, ...snapshot.values });
    setRestoredAt(new Date(snapshot.savedAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experienceId, serverUpdatedAt]);

  function discardRestored() {
    setValues(serverValues);
    setRestoredAt(null);
    clearSnapshot(storageKey(id));
  }

  const proposalPayload = (v: ExperienceFormValues) => ({
    year: v.year,
    term: v.term,
    title: v.title,
    description: v.description,
    strands: v.strands,
    location: v.location,
    fromDate: v.fromDate,
    toDate: v.toDate,
    learningOutcomes: v.learningOutcomes,
    sdgs: v.sdgs,
    investigation: v.investigation,
    learnerProfileAttributes: v.learnerProfileAttributes,
    learnerProfileNote: v.learnerProfileNote,
    supervisor: v.supervisor,
    casAdvisor: v.casAdvisor || null,
    stage: v.stage,
  });

  const blogPayload = (v: ExperienceFormValues) => ({
    blogTitle: v.blogTitle,
    blogBody: v.blogBody,
    headerImage: v.headerImage ?? "",
    headerWidth: v.headerWidth,
    headerHeight: v.headerHeight,
    images: v.images,
  });

  async function call(url: string, body: unknown, method = "POST") {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
    return data;
  }

  // --- autosave -----------------------------------------------------------
  // Only possible against the server once step 1 has created the draft; until
  // then the hook still keeps a local snapshot.
  const pushToServer = useCallback(
    async (v: ExperienceFormValues) => {
      if (!id) return;
      const res = await fetch(`/api/experiences/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: step === 1 ? "proposal" : "blog",
          autosave: true,
          data: step === 1 ? proposalPayload(v) : blogPayload(v),
        }),
      });
      if (!res.ok) throw new Error("autosave failed");
    },
    [id, step],
  );

  const autosave = useAutosave({
    key: storageKey(id),
    values,
    save: id ? pushToServer : undefined,
    enabled: !submitted,
  });

  /** Step 1 -> save the proposal, then move on to the reflection. */
  async function saveProposal(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (id) {
        await call(
          `/api/experiences/${id}`,
          { step: "proposal", data: proposalPayload(values) },
          "PATCH",
        );
      } else {
        const created = await call("/api/experiences", proposalPayload(values));
        setId(created.id);
        // The local snapshot was filed under "new"; move it onto the real id.
        renameSnapshot(storageKey(undefined), storageKey(created.id));
      }
      setRestoredAt(null);
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function saveBlog(submit: boolean) {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await call(
        `/api/experiences/${id}`,
        { step: "blog", data: blogPayload(values) },
        "PATCH",
      );
      if (submit) {
        await call(`/api/experiences/${id}/submit`, {});
      }
      // Safely on the server now, so the local recovery copy can go.
      setSubmitted(true);
      clearSnapshot(storageKey(id));
      router.push(submit ? "/my-cas?submitted=1" : "/my-cas?saved=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Steps step={step} />
        <SaveIndicator
          state={autosave.state}
          lastSavedAt={autosave.lastSavedAt}
          onServer={Boolean(id)}
        />
      </div>

      {restoredAt && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-info/30 bg-info-soft px-3 py-2 text-sm">
          <span className="text-info">
            Restored what you had written at{" "}
            {restoredAt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            .
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm ml-auto"
            onClick={discardRestored}
          >
            Discard and start from the saved version
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {step === 1 ? (
        <form onSubmit={saveProposal} className="card space-y-6 p-6">
          <Row label="Year" required htmlFor="year">
            <select
              id="year"
              className="select"
              value={values.year}
              onChange={(e) => set("year", e.target.value)}
              required
            >
              {years.map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </Row>

          <Row label="Term" required htmlFor="term">
            <select
              id="term"
              className="select"
              value={values.term}
              onChange={(e) => set("term", e.target.value)}
            >
              {TERMS.map((term) => (
                <option key={term}>{term}</option>
              ))}
            </select>
          </Row>

          <Row label="CAS Experience title" required htmlFor="title">
            <input
              id="title"
              className="input"
              placeholder="Add CAS Title"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              required
            />
          </Row>

          <Row
            label="Describe the experience which you would like to propose"
            required
            htmlFor="description"
          >
            <textarea
              id="description"
              className="textarea"
              placeholder="Describe Experience"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              required
            />
          </Row>

          <Row label="Which strand of C, A and S will fit" required>
            <MultiSelect
              placeholder="Check strands"
              ariaLabel="Which strand of C, A and S will fit"
              options={STRANDS.map((s) => ({ value: s, label: s }))}
              value={values.strands}
              onChange={(v) => set("strands", v)}
            />
          </Row>

          <Row label="Location" required htmlFor="location">
            <select
              id="location"
              className="select"
              value={values.location}
              onChange={(e) => set("location", e.target.value)}
            >
              {LOCATIONS.map((loc) => (
                <option key={loc}>{loc}</option>
              ))}
            </select>
          </Row>

          <Row label="CAS Experience duration - from date - to date" required>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                aria-label="From date"
                className="input"
                value={values.fromDate}
                onChange={(e) => set("fromDate", e.target.value)}
                required
              />
              <input
                type="date"
                aria-label="To date"
                className="input"
                value={values.toDate}
                onChange={(e) => set("toDate", e.target.value)}
                required
              />
            </div>
          </Row>

          <Row
            label="What are the learning outcomes that will be demonstrated through this CAS experience?"
            required
          >
            <MultiSelect
              placeholder="Check Learning Outcome"
              ariaLabel="Learning outcomes demonstrated through this CAS experience"
              options={LEARNING_OUTCOMES.map((lo) => ({
                value: lo.id,
                label: `${lo.id} - ${lo.label}`,
              }))}
              value={values.learningOutcomes}
              onChange={(v) => set("learningOutcomes", v)}
            />
          </Row>

          <Row label="Select the sustainability goals aligned with your CAS experience">
            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <MultiSelect
                placeholder="Check sustainability"
                ariaLabel="Sustainability goals aligned with your CAS experience"
                options={SDGS.map((goal) => ({
                  value: String(goal.id),
                  label: `${goal.id}. ${goal.label}`,
                }))}
                value={values.sdgs.map(String)}
                onChange={(v) => set("sdgs", v.map(Number))}
              />
              <SdgGrid selected={values.sdgs} />
            </div>
          </Row>

          <Row
            label="Investigation - a. What are your skills/interest and what is your purpose for selecting this CAS experience? b. In case of service, what is the issue you will be focusing on?"
            required
            htmlFor="investigation"
          >
            <textarea
              id="investigation"
              className="textarea"
              placeholder="Describe Investigation"
              value={values.investigation}
              onChange={(e) => set("investigation", e.target.value)}
              required
            />
          </Row>

          <Row label="Learner profile attributes that you will be developing as a result of this CAS experience. Which learner profile and how?">
            <div className="space-y-3">
              <MultiSelect
                placeholder="Add Attribute"
                ariaLabel="Learner profile attributes"
                options={LEARNER_PROFILE.map((a) => ({ value: a, label: a }))}
                value={values.learnerProfileAttributes}
                onChange={(v) => set("learnerProfileAttributes", v)}
              />
              <textarea
                className="textarea"
                placeholder="How will you develop them?"
                value={values.learnerProfileNote}
                onChange={(e) => set("learnerProfileNote", e.target.value)}
              />
            </div>
          </Row>

          <Row label="Supervisor for this CAS experience" htmlFor="supervisor">
            <input
              id="supervisor"
              className="input"
              placeholder="Add CAS Supervisor"
              value={values.supervisor}
              onChange={(e) => set("supervisor", e.target.value)}
            />
          </Row>

          <Row label="CAS Advisor" required htmlFor="advisor">
            <select
              id="advisor"
              className="select"
              value={values.casAdvisor}
              onChange={(e) => set("casAdvisor", e.target.value)}
              required
            >
              <option value="">Select CAS Advisor</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
            {teachers.length === 0 && (
              <p className="hint mt-1">
                No teachers are assigned to your section yet — ask your admin.
              </p>
            )}
          </Row>

          <Row label="Status of CAS experience" required htmlFor="stage">
            <select
              id="stage"
              className="select"
              value={values.stage}
              onChange={(e) => set("stage", e.target.value)}
            >
              {EXPERIENCE_STAGES.map((stage) => (
                <option key={stage}>{stage}</option>
              ))}
            </select>
          </Row>

          <div className="flex justify-end gap-3 border-t pt-5">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save and write reflection →"}
            </button>
          </div>
        </form>
      ) : (
        <div className="card space-y-6 p-6">
          <ImageUploader
            label="Header image"
            required
            preserveAspect
            hint="Required. Any shape works — it keeps its own proportions. At least 200px on each side, up to 8 MB."
            value={values.headerImage}
            onChange={(url, size) =>
              setValues((v) => ({
                ...v,
                headerImage: url,
                headerWidth: size?.width ?? null,
                headerHeight: size?.height ?? null,
              }))
            }
          />

          <Row label="Reflection title" required htmlFor="blogTitle">
            <input
              id="blogTitle"
              className="input"
              placeholder="What should your blog be called?"
              value={values.blogTitle}
              onChange={(e) => set("blogTitle", e.target.value)}
              required
            />
          </Row>

          <Row label="Your reflection" required htmlFor="blogBody">
            <textarea
              id="blogBody"
              className="textarea min-h-72"
              placeholder="What did you do, what did you learn, and what would you do differently? You can use ## for a heading, - for bullets and **bold**."
              value={values.blogBody}
              onChange={(e) => set("blogBody", e.target.value)}
              required
            />
            <p className="hint mt-1">
              {values.blogBody.trim().length} characters · at least 100 needed
            </p>
          </Row>

          <div>
            <span className="label">More images (optional)</span>
            <div className="grid gap-3 sm:grid-cols-3">
              {values.images.map((url) => (
                <div
                  key={url}
                  className="relative overflow-hidden rounded-lg border"
                >
                  <Image
                    src={url}
                    alt=""
                    width={400}
                    height={300}
                    className="h-28 w-full object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-danger absolute right-1.5 top-1.5"
                    onClick={() =>
                      set(
                        "images",
                        values.images.filter((i) => i !== url),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              <ImageUploader
                label=""
                value={null}
                onChange={(url) => url && set("images", [...values.images, url])}
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-between gap-3 border-t pt-5">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setStep(1)}
              disabled={busy}
            >
              ← Back to the form
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => saveBlog(false)}
                disabled={busy}
              >
                Save draft
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => saveBlog(true)}
                disabled={busy}
              >
                {busy ? "Submitting…" : "Submit for review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SaveIndicator({
  state,
  lastSavedAt,
  onServer,
}: {
  state: SaveState;
  lastSavedAt: Date | null;
  onServer: boolean;
}) {
  if (state === "clean") return null;

  const time = lastSavedAt
    ? lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const label =
    state === "saving"
      ? "Saving…"
      : state === "error"
        ? "Saved on this device — could not reach the server"
        : state === "saved"
          ? `Draft saved${time ? ` at ${time}` : ""}`
          : onServer
            ? "Unsaved changes…"
            : "Kept on this device until you continue";

  return (
    <p
      aria-live="polite"
      className={`hint flex items-center gap-1.5 ${
        state === "error" ? "text-danger" : ""
      }`}
    >
      <span aria-hidden>
        {state === "saving" ? "◌" : state === "error" ? "!" : state === "saved" ? "✓" : "•"}
      </span>
      {label}
    </p>
  );
}

function Steps({ step }: { step: 1 | 2 }) {
  const items = [
    { n: 1, label: "Experience proposal" },
    { n: 2, label: "Reflection blog" },
  ];
  return (
    <ol className="flex flex-wrap items-center gap-3">
      {items.map((item, i) => (
        <li key={item.n} className="flex items-center gap-3">
          <span
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${
              step === item.n
                ? "bg-brand text-white"
                : step > item.n
                  ? "bg-brand-soft text-brand-strong"
                  : "bg-surface-2 text-muted"
            }`}
          >
            <span aria-hidden>{step > item.n ? "✓" : item.n}</span>
            {item.label}
          </span>
          {i === 0 && <span aria-hidden className="h-px w-6 bg-line" />}
        </li>
      ))}
    </ol>
  );
}

function Row({
  label,
  required,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,20rem)_1fr] sm:gap-6">
      <label className="label sm:pt-2" htmlFor={htmlFor}>
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      <div>{children}</div>
    </div>
  );
}
