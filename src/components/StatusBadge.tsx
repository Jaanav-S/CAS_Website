import type { ReviewStatus } from "@/lib/constants";

const LABELS: Record<ReviewStatus, string> = {
  draft: "Draft",
  pending: "Pending review",
  approved: "Approved",
  rejected: "Needs changes",
};

export function StatusBadge({ status }: { status: ReviewStatus }) {
  return <span className={`badge badge-${status}`}>{LABELS[status]}</span>;
}
