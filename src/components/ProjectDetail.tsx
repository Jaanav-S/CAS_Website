import { PROJECT_STAGES } from "@/lib/constants";
import { formatDate, formatDateTime, formatRange } from "@/lib/format";
import { sectionLabel } from "@/lib/cohort";

export type ProjectApprovalView = {
  status: "pending" | "approved" | "rejected";
  byName?: string;
  comment?: string;
  at?: string | null;
};

export type ProjectView = {
  _id: string;
  title: string;
  focus: string;
  fromDate?: string;
  toDate?: string;
  strands: string[];
  investigation: string;
  planning: string;
  action: string;
  reflection: string;
  budget?: string;
  donationOrg?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  externalSupervisor?: string;
  riskAssessmentRequired: boolean;
  riskAssessmentCompleted: boolean;
  precautions?: string;
  planningDocUrl?: string;
  enrollmentFormUrl?: string;
  submittedAt?: string;
  owner: { _id: string; name: string; email: string };
  members: { _id: string; name: string; email: string }[];
  casSupervisor?: { _id: string; name: string } | null;
  section?: {
    name: string;
    year?: string;
    dpYear?: string;
    gradYear?: number;
  } | null;
  teacherApproval: ProjectApprovalView;
  supervisorApproval: ProjectApprovalView;
  completion?: {
    status: "none" | "pending" | "approved" | "rejected";
    approvedAt?: string | null;
    teacher: ProjectApprovalView;
    supervisor: ProjectApprovalView;
  } | null;
};

function Pip({
  label,
  approval,
}: {
  label: string;
  approval: ProjectApprovalView;
}) {
  return (
    <span
      className={`badge ${
        approval.status === "approved"
          ? "badge-approved"
          : approval.status === "rejected"
            ? "badge-rejected"
            : "badge-pending"
      }`}
    >
      <span aria-hidden>
        {approval.status === "approved"
          ? "✓"
          : approval.status === "rejected"
            ? "✗"
            : "…"}
      </span>
      {label}
      {approval.byName ? ` · ${approval.byName}` : ""}
    </span>
  );
}

/** Both rounds at a glance: the go-ahead to start, then the sign-off to finish. */
export function ApprovalPips({ project }: { project: ProjectView }) {
  const stage = project.completion?.status ?? "none";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="hint w-24 font-semibold uppercase tracking-wide">
          To start
        </span>
        <Pip label="Teacher" approval={project.teacherApproval} />
        <Pip label="CAS Coordinator" approval={project.supervisorApproval} />
      </div>

      {stage !== "none" && project.completion && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="hint w-24 font-semibold uppercase tracking-wide">
            Finished
          </span>
          <Pip label="Teacher" approval={project.completion.teacher} />
          <Pip label="CAS Coordinator" approval={project.completion.supervisor} />
          {stage === "approved" && (
            <span className="badge badge-approved">Published on Discovery</span>
          )}
        </div>
      )}
    </div>
  );
}

export function ProjectDetail({ project }: { project: ProjectView }) {
  const people = [project.owner, ...(project.members ?? [])].filter((p) => p?.name);

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          CAS project details
        </h2>

        <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Fact label="Project members" value={people.map((p) => p.name).join(", ")} />
          <Fact
            label="Anticipated dates"
            value={
              project.fromDate && project.toDate
                ? formatRange(project.fromDate, project.toDate)
                : "—"
            }
          />
          <Fact label="CAS Coordinator" value={project.casSupervisor?.name ?? "—"} />
          <Fact label="Strands" value={project.strands.join(", ") || "—"} />
          <Fact
            label="Section"
            value={project.section ? sectionLabel(project.section) : "—"}
          />
          <Fact
            label="External supervisor"
            value={project.externalSupervisor || "—"}
          />
        </dl>

        <Block label="Focus / objective">
          <p className="whitespace-pre-line text-sm leading-relaxed">{project.focus}</p>
        </Block>
      </section>

      <section className="card p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          CAS stages
        </h2>
        <div className="mt-4 space-y-5">
          {PROJECT_STAGES.map((stage) => (
            <Block key={stage.key} label={stage.label}>
              <p className="whitespace-pre-line text-sm leading-relaxed">
                {project[stage.key] || "—"}
              </p>
            </Block>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          Budget and risk
        </h2>

        <Block label="Budget details">
          <p className="whitespace-pre-line text-sm leading-relaxed">
            {project.budget || "—"}
          </p>
        </Block>

        <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Fact label="Donating to" value={project.donationOrg || "—"} />
          <Fact
            label="Organisation contact"
            value={
              [project.contactPerson, project.contactPhone, project.contactEmail]
                .filter(Boolean)
                .join(" · ") || "—"
            }
          />
          <Fact
            label="Risk assessment required"
            value={project.riskAssessmentRequired ? "Yes" : "No"}
          />
          <Fact
            label="Risk assessment completed"
            value={
              project.riskAssessmentRequired
                ? project.riskAssessmentCompleted
                  ? "Yes"
                  : "Not yet"
                : "Not applicable"
            }
          />
        </dl>

        {project.riskAssessmentRequired && (
          <Block label="Precautions taken">
            <p className="whitespace-pre-line text-sm leading-relaxed">
              {project.precautions || "—"}
            </p>
          </Block>
        )}

        {(project.planningDocUrl || project.enrollmentFormUrl) && (
          <Block label="Links">
            <ul className="space-y-1 text-sm">
              {project.planningDocUrl && (
                <li>
                  <a
                    href={project.planningDocUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-semibold text-info hover:underline"
                  >
                    Planning doc / sheet ↗
                  </a>
                </li>
              )}
              {project.enrollmentFormUrl && (
                <li>
                  <a
                    href={project.enrollmentFormUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-semibold text-info hover:underline"
                  >
                    Participation form ↗
                  </a>
                </li>
              )}
            </ul>
          </Block>
        )}
      </section>

      {feedback(project).length > 0 && (
        <section className="card p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            Approver feedback
          </h2>
          <ul className="mt-4 space-y-3">
            {feedback(project).map(([label, a]) => (
                <li key={label} className="text-sm">
                  <p className="font-semibold">
                    {a.byName ?? label}{" "}
                    <span className="font-normal text-muted">
                      {a.status === "approved" ? "approved" : "asked for changes"}
                      {a.at ? ` · ${formatDateTime(a.at)}` : ""}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-line rounded-lg bg-surface-2 px-3 py-2">
                    {a.comment}
                  </p>
                </li>
              ))}
          </ul>
        </section>
      )}

      {project.submittedAt && (
        <p className="hint">Submitted {formatDate(project.submittedAt)}</p>
      )}
    </div>
  );
}

/** Every comment either round has produced, newest round last. */
function feedback(project: ProjectView): [string, ProjectApprovalView][] {
  const rows: [string, ProjectApprovalView][] = [
    ["Teacher", project.teacherApproval],
    ["CAS Coordinator", project.supervisorApproval],
  ];
  if (project.completion && project.completion.status !== "none") {
    rows.push(
      ["Teacher (on completion)", project.completion.teacher],
      ["CAS Coordinator (on completion)", project.completion.supervisor],
    );
  }
  return rows.filter(([, a]) => a?.comment);
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="hint">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
    </div>
  );
}

function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <p className="hint mb-1 font-semibold uppercase tracking-wide">{label}</p>
      {children}
    </div>
  );
}
