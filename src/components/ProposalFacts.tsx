import { LEARNING_OUTCOMES, SDGS } from "@/lib/constants";
import { formatRange } from "@/lib/format";

export type ProposalFactsProps = {
  year: string;
  term: string;
  location: string;
  stage: string;
  fromDate: string | Date;
  toDate: string | Date;
  strands: string[];
  learningOutcomes: string[];
  sdgs: number[];
  description: string;
  investigation: string;
  learnerProfileAttributes: string[];
  learnerProfileNote?: string;
  supervisor?: string;
  advisorName?: string | null;
};

export function ProposalFacts(props: ProposalFactsProps) {
  const loLookup = new Map<string, string>(
    LEARNING_OUTCOMES.map((lo) => [lo.id, lo.label]),
  );
  const sdgLookup = new Map<number, string>(SDGS.map((g) => [g.id, g.label]));

  return (
    <div className="card p-6">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
        The proposal
      </h2>

      <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Fact label="Year" value={props.year} />
        <Fact label="Term" value={props.term} />
        <Fact label="Location" value={props.location} />
        <Fact label="Status of experience" value={props.stage} />
        <Fact label="Dates" value={formatRange(props.fromDate, props.toDate)} />
        <Fact label="Strands" value={props.strands.join(", ") || "—"} />
        <Fact label="Supervisor" value={props.supervisor || "—"} />
        <Fact label="CAS advisor" value={props.advisorName || "—"} />
      </dl>

      <div className="mt-6 space-y-5 border-t pt-5">
        <Block label="Learning outcomes">
          {props.learningOutcomes.length === 0 ? (
            <p className="text-sm text-muted">—</p>
          ) : (
            <ul className="space-y-1">
              {props.learningOutcomes.map((id) => (
                <li key={id} className="text-sm">
                  <span className="font-semibold">{id}</span> — {loLookup.get(id)}
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block label="Sustainable Development Goals">
          {props.sdgs.length === 0 ? (
            <p className="text-sm text-muted">None selected</p>
          ) : (
            <ul className="space-y-1">
              {props.sdgs.map((id) => (
                <li key={id} className="text-sm">
                  <span className="font-semibold">{id}</span> — {sdgLookup.get(id)}
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block label="Description of the experience">
          <p className="whitespace-pre-line text-sm leading-relaxed">
            {props.description}
          </p>
        </Block>

        <Block label="Investigation">
          <p className="whitespace-pre-line text-sm leading-relaxed">
            {props.investigation}
          </p>
        </Block>

        <Block label="Learner profile attributes">
          <p className="text-sm">
            {props.learnerProfileAttributes.join(", ") || "—"}
          </p>
          {props.learnerProfileNote && (
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted">
              {props.learnerProfileNote}
            </p>
          )}
        </Block>
      </div>
    </div>
  );
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
    <div>
      <p className="hint mb-1 font-semibold uppercase tracking-wide">{label}</p>
      {children}
    </div>
  );
}
