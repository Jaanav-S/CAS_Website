import { dbConnect } from "@/lib/db";
import { Experience } from "@/models/Experience";
import { CasProject } from "@/models/CasProject";
import mongoose from "mongoose";
import { User } from "@/models/User";

export type SearchHit = {
  kind: "reflection" | "project";
  id: string;
  href: string;
  title: string;
  people: string;
  status: string;
  sectionName?: string;
};

/** Escapes a user string so it is matched literally inside a regex. */
function safeRegex(q: string): RegExp {
  return new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

/**
 * One keyword box for staff: matches reflections and CAS projects by their
 * title, and — the point of it — by the name of any student involved.
 */
export async function searchAll(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  await dbConnect();
  const rx = safeRegex(q);

  // Names live on the User, so resolve matching people first and match their ids.
  const people = await User.find({ name: rx, role: "student" })
    .select("_id")
    .limit(50)
    .lean<{ _id: mongoose.Types.ObjectId }[]>();
  const ids = people.map((p) => p._id);

  const [reflections, projects] = await Promise.all([
    Experience.find({
      status: { $ne: "draft" },
      $or: [{ title: rx }, { blogTitle: rx }, { student: { $in: ids } }],
    })
      .select("title blogTitle status student section")
      .populate("student", "name")
      .populate("section", "name")
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean(),
    CasProject.find({
      $or: [{ title: rx }, { owner: { $in: ids } }, { members: { $in: ids } }],
    })
      .select("title status owner members section")
      .populate("owner", "name")
      .populate("members", "name")
      .populate("section", "name")
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean(),
  ]);

  const reflectionHits: SearchHit[] = (
    reflections as unknown as {
      _id: unknown;
      title: string;
      blogTitle?: string;
      status: string;
      student?: { name: string };
      section?: { name: string } | null;
    }[]
  ).map((r) => ({
    kind: "reflection",
    id: String(r._id),
    href: `/teacher/review/${r._id}`,
    title: r.blogTitle || r.title,
    people: r.student?.name ?? "Unknown",
    status: r.status,
    sectionName: r.section?.name,
  }));

  const projectHits: SearchHit[] = (
    projects as unknown as {
      _id: unknown;
      title: string;
      status: string;
      owner?: { name: string };
      members?: { name: string }[];
      section?: { name: string } | null;
    }[]
  ).map((p) => ({
    kind: "project",
    id: String(p._id),
    href: `/projects/${p._id}`,
    title: p.title || "Untitled project",
    people: [p.owner, ...(p.members ?? [])]
      .filter((m): m is { name: string } => Boolean(m?.name))
      .map((m) => m.name)
      .join(", "),
    status: p.status,
    sectionName: p.section?.name,
  }));

  return [...reflectionHits, ...projectHits];
}
