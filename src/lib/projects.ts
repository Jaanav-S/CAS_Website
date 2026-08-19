import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { CasProject, type CasProjectDoc } from "@/models/CasProject";
import { User, type UserDoc } from "@/models/User";
import { teacherSectionIds } from "@/lib/scope";
import type { SessionUser } from "@/lib/auth";

export type MemberCheck = {
  email: string;
  ok: boolean;
  id?: string;
  name?: string;
  reason?: string;
};

/**
 * Turns typed-in email addresses into real accounts, refusing anything that is
 * not a registered, approved, still-active student. Runs both live in the form
 * and again on save, so the browser check is convenience, not security.
 */
export async function resolveMembers(
  emails: string[],
  ownerId: string,
): Promise<MemberCheck[]> {
  await dbConnect();

  const cleaned = emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (cleaned.length === 0) return [];

  const found = await User.find({ email: { $in: cleaned } })
    .select("name email role status graduated")
    .lean<UserDoc[]>();
  const byEmail = new Map(found.map((u) => [u.email, u]));

  const seen = new Set<string>();

  return cleaned.map((email) => {
    if (seen.has(email)) {
      return { email, ok: false, reason: "Listed twice." };
    }
    seen.add(email);

    const user = byEmail.get(email);
    if (!user) return { email, ok: false, reason: "No account with that email." };
    if (String(user._id) === ownerId) {
      return { email, ok: false, reason: "That is you — you are already on the project." };
    }
    if (user.role !== "student") {
      return { email, ok: false, reason: `That account is a ${user.role}, not a student.` };
    }
    if (user.status !== "approved") {
      return { email, ok: false, reason: "That account has not been approved yet." };
    }
    if (user.graduated) {
      return { email, ok: false, reason: "That student has already graduated." };
    }
    return { email, ok: true, id: String(user._id), name: user.name };
  });
}

/**
 * Reads an id off a reference that may or may not have been populated — a raw
 * ObjectId stringifies fine, a populated document does not.
 */
function refId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "object" && value !== null && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
}

/** Owner and members alike may read and edit; everything else is read-only. */
export function isProjectMember(
  project: Pick<CasProjectDoc, "owner" | "members">,
  userId: string,
): boolean {
  if (refId(project.owner) === userId) return true;
  return (project.members ?? []).some((m) => refId(m) === userId);
}

export async function canViewProject(
  project: Pick<CasProjectDoc, "owner" | "members" | "section">,
  user: SessionUser,
): Promise<boolean> {
  if (user.role === "admin" || user.role === "supervisor") return true;
  if (isProjectMember(project, user.id)) return true;
  if (user.role === "teacher" && project.section) {
    const sections = (await teacherSectionIds(user.id)).map(String);
    return sections.includes(refId(project.section));
  }
  return false;
}

/**
 * Which of the two approvals this person is responsible for, if any.
 * A supervisor signs off any project; a teacher only their own section's.
 */
export async function approverRole(
  project: Pick<CasProjectDoc, "section">,
  user: SessionUser,
): Promise<"teacher" | "supervisor" | null> {
  if (user.role === "supervisor") return "supervisor";
  if (user.role === "admin") return "supervisor";
  if (user.role === "teacher") {
    if (!project.section) return null;
    const sections = (await teacherSectionIds(user.id)).map(String);
    return sections.includes(refId(project.section)) ? "teacher" : null;
  }
  return null;
}

/** Every project a student owns or has been added to. */
export async function projectsForStudent(userId: string) {
  await dbConnect();
  const id = new mongoose.Types.ObjectId(userId);
  return CasProject.find({ $or: [{ owner: id }, { members: id }] })
    .select("title status strands fromDate toDate submittedAt updatedAt teacherApproval supervisorApproval timeline owner members section")
    .populate("owner", "name email")
    .populate("members", "name email")
    .populate("section", "name year")
    .sort({ updatedAt: -1 })
    .lean();
}

/**
 * Google deep links used by the supervisor's inbox. The calendar one prefills
 * a meeting with the students as guests; Google does not publish an
 * email-addressed deep link for Chat, so that one just opens Chat.
 */
export function googleCalendarUrl(emails: string[], title: string): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `CAS project meeting — ${title}`,
    details: "Scheduled from the CAS Portal.",
  });
  for (const email of emails) params.append("add", email);
  return `https://calendar.google.com/calendar/render?${params}`;
}

export const GOOGLE_CHAT_URL = "https://chat.google.com/";

export function gmailComposeUrl(emails: string[], title: string): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: emails.join(","),
    su: `CAS project: ${title}`,
  });
  return `https://mail.google.com/mail/?${params}`;
}

/** Accounts that can act as the named CAS supervisor on a project. */
export async function supervisorOptions(): Promise<{ id: string; name: string }[]> {
  await dbConnect();
  const rows = await User.find({ role: "supervisor", status: "approved" })
    .select("name")
    .sort({ name: 1 })
    .lean<{ _id: unknown; name: string }[]>();
  return rows.map((r) => ({ id: String(r._id), name: r.name }));
}

/** One project with everybody's names resolved. */
export async function projectDetail(id: string) {
  await dbConnect();
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;
  return CasProject.findById(id)
    .populate("owner", "name email")
    .populate("members", "name email")
    .populate("casSupervisor", "name")
    .populate("section", "name year")
    .lean();
}

export type ProjectListItem = {
  _id: string;
  title: string;
  status: string;
  strands: string[];
  submittedAt?: string;
  updatedAt: string;
  owner: { _id: string; name: string; email: string };
  members: { _id: string; name: string; email: string }[];
  section?: { name: string; year: string } | null;
  teacherApproval: { status: string; byName?: string };
  supervisorApproval: { status: string; byName?: string };
  timeline: unknown[];
};

const LIST_FIELDS =
  "title status strands submittedAt updatedAt owner members section teacherApproval supervisorApproval timeline";

/**
 * The projects an approver is responsible for: everything for a supervisor or
 * admin, own sections only for a teacher.
 */
export async function projectQueue(
  user: SessionUser,
  status?: string,
): Promise<ProjectListItem[]> {
  await dbConnect();

  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  else query.status = { $ne: "draft" };

  if (user.role === "teacher") {
    const sections = await teacherSectionIds(user.id);
    query.section = { $in: sections };
  }

  const docs = await CasProject.find(query)
    .select(LIST_FIELDS)
    .populate("owner", "name email")
    .populate("members", "name email")
    .populate("section", "name year")
    .sort({ submittedAt: 1, updatedAt: -1 })
    .limit(200)
    .lean();

  return docs as unknown as ProjectListItem[];
}
