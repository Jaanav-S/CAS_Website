"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { PROJECT_STAGES, STRANDS } from "@/lib/constants";
import { MultiSelect } from "@/components/MultiSelect";
import { MemberPicker } from "@/components/MemberPicker";
import { toDateInput } from "@/lib/format";
import { storageKey, useAutosave, type SaveState } from "@/components/useAutosave";
import { clearSnapshot, renameSnapshot } from "@/components/useAutosave";

export type Supervisor = { id: string; name: string };

export type ProjectFormValues = {
  title: string;
  focus: string;
  fromDate: string;
  toDate: string;
  casSupervisor: string;
  strands: string[];
  investigation: string;
  planning: string;
  action: string;
  reflection: string;
  budget: string;
  donationOrg: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  externalSupervisor: string;
  riskAssessmentRequired: boolean;
  riskAssessmentCompleted: boolean;
  precautions: string;
  planningDocUrl: string;
  enrollmentFormUrl: string;
  memberEmails: string[];
};

function emptyValues(): ProjectFormValues {
  return {
    title: "",
    focus: "",
    fromDate: "",
    toDate: "",
    casSupervisor: "",
    strands: [],
    investigation: "",
    planning: "",
    action: "",
    reflection: "",
    budget: "",
    donationOrg: "",
    contactPerson: "",
    contactPhone: "",
    contactEmail: "",
    externalSupervisor: "",
    riskAssessmentRequired: false,
    riskAssessmentCompleted: false,
    precautions: "",
    planningDocUrl: "",
    enrollmentFormUrl: "",
    memberEmails: [],
  };
}

export function ProjectForm({
  supervisors,
  projectId,
  initial,
  isOwner = true,
}: {
  supervisors: Supervisor[];
  projectId?: string;
  initial?: Partial<ProjectFormValues>;
  /** Only the creator may change who is on the project. */
  isOwner?: boolean;
}) {
  const router = useRouter();
  const [id, setId] = useState<string | undefined>(projectId);
  const [values, setValues] = useState<ProjectFormValues>({
    ...emptyValues(),
    ...initial,
    fromDate: toDateInput(initial?.fromDate),
    toDate: toDateInput(initial?.toDate),
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function set<K extends keyof ProjectFormValues>(
    key: K,
    value: ProjectFormValues[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  const payload = (v: ProjectFormValues) => ({
    title: v.title,
    focus: v.focus,
    fromDate: v.fromDate || null,
    toDate: v.toDate || null,
    casSupervisor: v.casSupervisor || null,
    strands: v.strands,
    investigation: v.investigation,
    planning: v.planning,
    action: v.action,
    reflection: v.reflection,
    budget: v.budget,
    donationOrg: v.donationOrg,
    contactPerson: v.contactPerson,
    contactPhone: v.contactPhone,
    contactEmail: v.contactEmail,
    externalSupervisor: v.externalSupervisor,
    riskAssessmentRequired: v.riskAssessmentRequired,
    riskAssessmentCompleted: v.riskAssessmentCompleted,
    precautions: v.precautions,
    planningDocUrl: v.planningDocUrl,
    enrollmentFormUrl: v.enrollmentFormUrl,
    ...(isOwner
      ? { memberEmails: v.memberEmails.map((e) => e.trim()).filter(Boolean) }
      : {}),
  });

  const pushToServer = useCallback(
    async (v: ProjectFormValues) => {
      if (!id) return;
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload(v) }),
      });
      if (!res.ok) throw new Error("autosave failed");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, isOwner],
  );

  const autosave = useAutosave({
    key: storageKey(id ? `project-${id}` : "project-new"),
    values,
    save: id ? pushToServer : undefined,
    enabled: !submitted,
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

  async function save(submit: boolean) {
    setBusy(true);
    setError(null);
    try {
      let projectKey = id;
      if (projectKey) {
        await call(`/api/projects/${projectKey}`, { data: payload(values) }, "PATCH");
      } else {
        const created = await call("/api/projects", payload(values));
        projectKey = created.id as string;
        setId(projectKey);
        renameSnapshot(
          storageKey("project-new"),
          storageKey(`project-${projectKey}`),
        );
      }

      if (submit) await call(`/api/projects/${projectKey}/submit`, {});

      setSubmitted(true);
      clearSnapshot(storageKey(`project-${projectKey}`));
      router.push(submit ? "/my-cas?tab=projects&submitted=1" : `/projects/${projectKey}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="hint">
          Everyone you add can edit this page too. It goes to your teacher{" "}
          <strong>and</strong> the CAS supervisor — both have to approve it.
        </p>
        <SaveIndicator
          state={autosave.state}
          lastSavedAt={autosave.lastSavedAt}
          onServer={Boolean(id)}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <form
        className="card divide-y p-0"
        onSubmit={(e) => {
          e.preventDefault();
          void save(true);
        }}
      >
        <Group title="CAS project details">
          <Row label="Student project members">
            {isOwner ? (
              <MemberPicker
                emails={values.memberEmails}
                onChange={(v) => set("memberEmails", v)}
              />
            ) : (
              <p className="text-sm text-muted">
                Only the student who created the project can change this.
              </p>
            )}
          </Row>

          <Row label="Title of the project" required htmlFor="p-title">
            <input
              id="p-title"
              className="input"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </Row>

          <Row label="Focus / objective of project" required htmlFor="p-focus">
            <textarea
              id="p-focus"
              className="textarea"
              value={values.focus}
              onChange={(e) => set("focus", e.target.value)}
            />
          </Row>

          <Row label="Anticipated dates / duration of CAS project" required>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                aria-label="From date"
                className="input"
                value={values.fromDate}
                onChange={(e) => set("fromDate", e.target.value)}
              />
              <input
                type="date"
                aria-label="To date"
                className="input"
                value={values.toDate}
                onChange={(e) => set("toDate", e.target.value)}
              />
            </div>
          </Row>

          <Row label="CAS supervisor" htmlFor="p-supervisor">
            <select
              id="p-supervisor"
              className="select"
              value={values.casSupervisor}
              onChange={(e) => set("casSupervisor", e.target.value)}
            >
              <option value="">Select CAS supervisor</option>
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {supervisors.length === 0 && (
              <p className="hint mt-1">
                No CAS supervisor account exists yet — ask your admin to add one.
              </p>
            )}
          </Row>

          <Row label="CAS strands" required>
            <MultiSelect
              placeholder="Check the strands"
              ariaLabel="CAS strands"
              options={STRANDS.map((s) => ({ value: s, label: s }))}
              value={values.strands}
              onChange={(v) => set("strands", v)}
            />
          </Row>
        </Group>

        <Group
          title="CAS stages"
          hint="For each stage, describe either what has been done or what you plan to do, with deadlines."
        >
          {PROJECT_STAGES.map((stage) => (
            <Row
              key={stage.key}
              label={stage.label}
              help={stage.help}
              required
              htmlFor={`p-${stage.key}`}
            >
              <textarea
                id={`p-${stage.key}`}
                className="textarea"
                value={values[stage.key]}
                onChange={(e) => set(stage.key, e.target.value)}
              />
            </Row>
          ))}
        </Group>

        <Group title="Budget details">
          <Row label="Budget" htmlFor="p-budget">
            <textarea
              id="p-budget"
              className="textarea"
              value={values.budget}
              onChange={(e) => set("budget", e.target.value)}
            />
          </Row>

          <Row
            label="If planning to donate, name of the organisation"
            htmlFor="p-donation"
          >
            <input
              id="p-donation"
              className="input"
              value={values.donationOrg}
              onChange={(e) => set("donationOrg", e.target.value)}
            />
          </Row>

          <Row label="Contact person at the organisation, if applicable">
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                className="input"
                placeholder="Name"
                aria-label="Contact person name"
                value={values.contactPerson}
                onChange={(e) => set("contactPerson", e.target.value)}
              />
              <input
                className="input"
                placeholder="Phone"
                aria-label="Contact phone"
                value={values.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
              />
              <input
                type="email"
                className="input"
                placeholder="Email"
                aria-label="Contact email"
                value={values.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
              />
            </div>
          </Row>

          <Row
            label="Teacher or other external supervisor, if applicable"
            htmlFor="p-external"
          >
            <input
              id="p-external"
              className="input"
              value={values.externalSupervisor}
              onChange={(e) => set("externalSupervisor", e.target.value)}
            />
          </Row>
        </Group>

        <Group title="Risk">
          <Row label="Risk assessment required" htmlFor="p-risk-required">
            <select
              id="p-risk-required"
              className="select"
              value={values.riskAssessmentRequired ? "yes" : "no"}
              onChange={(e) =>
                set("riskAssessmentRequired", e.target.value === "yes")
              }
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </Row>

          {values.riskAssessmentRequired && (
            <>
              <Row label="Risk assessment completed" htmlFor="p-risk-done">
                <select
                  id="p-risk-done"
                  className="select"
                  value={values.riskAssessmentCompleted ? "yes" : "no"}
                  onChange={(e) =>
                    set("riskAssessmentCompleted", e.target.value === "yes")
                  }
                >
                  <option value="no">Not yet</option>
                  <option value="yes">Yes</option>
                </select>
              </Row>

              <Row label="Details of precautions taken" required htmlFor="p-precautions">
                <textarea
                  id="p-precautions"
                  className="textarea"
                  value={values.precautions}
                  onChange={(e) => set("precautions", e.target.value)}
                />
              </Row>
            </>
          )}
        </Group>

        <Group title="Links">
          <Row label="Link to your planning doc or sheet" htmlFor="p-doc">
            <input
              id="p-doc"
              type="url"
              className="input"
              placeholder="https://docs.google.com/…"
              value={values.planningDocUrl}
              onChange={(e) => set("planningDocUrl", e.target.value)}
            />
          </Row>

          <Row
            label="Google form link for participation or enrolment of other students"
            htmlFor="p-form"
          >
            <input
              id="p-form"
              type="url"
              className="input"
              placeholder="https://forms.gle/…"
              value={values.enrollmentFormUrl}
              onChange={(e) => set("enrollmentFormUrl", e.target.value)}
            />
          </Row>
        </Group>

        <div className="flex flex-wrap justify-end gap-3 p-6">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void save(false)}
            disabled={busy}
          >
            Save draft
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Submitting…" : "Submit for approval"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-5 p-6">
      <legend className="font-bold">{title}</legend>
      {hint && <p className="hint -mt-4">{hint}</p>}
      {children}
    </fieldset>
  );
}

function Row({
  label,
  help,
  required,
  htmlFor,
  children,
}: {
  label: string;
  help?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,18rem)_1fr] sm:gap-6">
      <label className="label sm:pt-2" htmlFor={htmlFor}>
        {label}
        {required && <span className="text-danger"> *</span>}
        {help && <span className="mt-0.5 block font-normal text-muted">{help}</span>}
      </label>
      <div>{children}</div>
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
  const pending = state === "dirty" || state === "saving";
  const tone = pending ? "pending" : state === "error" ? "error" : "saved";

  const label = pending
    ? "Saving…"
    : state === "error"
      ? "Saved locally — could not reach the server"
      : onServer
        ? `Draft saved${time ? ` at ${time}` : ""}`
        : "Saved locally";

  return (
    <p
      aria-live="polite"
      className={`hint flex items-center gap-2 ${state === "error" ? "text-danger" : ""}`}
    >
      <span aria-hidden className={`save-dot save-dot-${tone}`} />
      {label}
    </p>
  );
}
