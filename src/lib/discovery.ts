import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { Experience } from "@/models/Experience";
import { CasProject } from "@/models/CasProject";
import { DP_YEARS, type DiscoveryKind } from "@/lib/constants";

export type FeedItem = {
  id: string;
  kind: DiscoveryKind;
  href: string;
  title: string;
  excerpt: string;
  image?: string;
  strands: string[];
  dpYear?: string | null;
  authors: { name: string; image?: string }[];
  sectionName?: string;
  publishedAt?: string;
};

export type FeedFilters = {
  kind?: string | null;
  section?: string | null;
  student?: string | null;
  dpYear?: string | null;
};

const objectId = /^[0-9a-fA-F]{24}$/;

/** Strips the light Markdown out of a body so cards show plain prose. */
function excerpt(text: string | undefined, length = 180): string {
  return (text ?? "").replace(/[#*>_-]/g, "").replace(/\s+/g, " ").trim().slice(0, length);
}

/**
 * Discovery shows two different things — individual reflections and finished
 * CAS projects — merged into one feed and filterable by kind, section, student
 * and DP year.
 */
export async function discoveryFeed(filters: FeedFilters): Promise<FeedItem[]> {
  await dbConnect();

  const { kind } = filters;
  const wantReflections = kind !== "project";
  const wantProjects = kind !== "reflection";

  const [reflections, projects] = await Promise.all([
    wantReflections ? reflectionItems(filters) : Promise.resolve([]),
    wantProjects ? projectItems(filters) : Promise.resolve([]),
  ]);

  return [...reflections, ...projects]
    .sort(
      (a, b) =>
        new Date(b.publishedAt ?? 0).getTime() -
        new Date(a.publishedAt ?? 0).getTime(),
    )
    .slice(0, 60);
}

type ReflectionDoc = {
  _id: unknown;
  title: string;
  blogTitle?: string;
  blogBody?: string;
  headerImage?: string;
  strands: string[];
  dpYear?: string | null;
  reviewedAt?: Date;
  submittedAt?: Date;
  student: { name: string; image?: string };
  section?: { name: string } | null;
};

async function reflectionItems(filters: FeedFilters): Promise<FeedItem[]> {
  const query: Record<string, unknown> = { status: "approved" };
  if (filters.section && objectId.test(filters.section)) query.section = filters.section;
  if (filters.student && objectId.test(filters.student)) query.student = filters.student;
  if (filters.dpYear && DP_YEARS.includes(filters.dpYear as never)) {
    query.dpYear = filters.dpYear;
  }

  const docs = await Experience.find(query)
    .select(
      "title blogTitle blogBody headerImage strands dpYear reviewedAt submittedAt student section",
    )
    .populate("student", "name image")
    .populate("section", "name")
    .sort({ reviewedAt: -1 })
    .limit(60)
    .lean<ReflectionDoc[]>();

  return docs.map((doc) => ({
    id: String(doc._id),
    kind: "reflection" as const,
    href: `/discovery/${doc._id}`,
    title: doc.blogTitle || doc.title,
    excerpt: excerpt(doc.blogBody),
    image: doc.headerImage,
    strands: doc.strands ?? [],
    dpYear: doc.dpYear,
    authors: [{ name: doc.student?.name ?? "Unknown", image: doc.student?.image }],
    sectionName: doc.section?.name,
    publishedAt: (doc.reviewedAt ?? doc.submittedAt)?.toISOString(),
  }));
}

type ProjectDoc = {
  _id: unknown;
  title: string;
  focus?: string;
  strands: string[];
  dpYear?: string | null;
  completion?: { approvedAt?: Date; submittedAt?: Date };
  owner: { _id: unknown; name: string; image?: string };
  members: { _id: unknown; name: string; image?: string }[];
  section?: { name: string } | null;
  timeline: { date: Date; image: string }[];
};

async function projectItems(filters: FeedFilters): Promise<FeedItem[]> {
  const query: Record<string, unknown> = { "completion.status": "approved" };
  if (filters.section && objectId.test(filters.section)) query.section = filters.section;
  if (filters.dpYear && DP_YEARS.includes(filters.dpYear as never)) {
    query.dpYear = filters.dpYear;
  }
  if (filters.student && objectId.test(filters.student)) {
    // A project belongs to everyone on it, not only whoever created it.
    const id = new mongoose.Types.ObjectId(filters.student);
    query.$or = [{ owner: id }, { members: id }];
  }

  const docs = await CasProject.find(query)
    .select("title focus strands dpYear completion owner members section timeline")
    .populate("owner", "name image")
    .populate("members", "name image")
    .populate("section", "name")
    .sort({ "completion.approvedAt": -1 })
    .limit(60)
    .lean<ProjectDoc[]>();

  return docs.map((doc) => {
    // The earliest timeline photo stands in as the project's cover.
    const cover = [...(doc.timeline ?? [])].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )[0];

    return {
      id: String(doc._id),
      kind: "project" as const,
      href: `/projects/${doc._id}`,
      title: doc.title,
      excerpt: excerpt(doc.focus),
      image: cover?.image,
      strands: doc.strands ?? [],
      dpYear: doc.dpYear,
      authors: [doc.owner, ...(doc.members ?? [])]
        .filter((p) => p?.name)
        .map((p) => ({ name: p.name, image: p.image })),
      sectionName: doc.section?.name,
      publishedAt: (doc.completion?.approvedAt ?? doc.completion?.submittedAt)?.toISOString(),
    };
  });
}

/** Only offer filter values that have something published behind them. */
export async function discoveryFilterOptions() {
  await dbConnect();

  const [expSections, expStudents, projSections, projOwners, projMembers] =
    await Promise.all([
      Experience.distinct("section", { status: "approved" }),
      Experience.distinct("student", { status: "approved" }),
      CasProject.distinct("section", { "completion.status": "approved" }),
      CasProject.distinct("owner", { "completion.status": "approved" }),
      CasProject.distinct("members", { "completion.status": "approved" }),
    ]);

  return {
    sectionIds: [...expSections, ...projSections].filter(Boolean),
    studentIds: [...expStudents, ...projOwners, ...projMembers].filter(Boolean),
  };
}
