import { requireRole } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Section } from "@/models/Section";
import { User } from "@/models/User";
import { plain } from "@/lib/serialize";
import { describeSection } from "@/lib/cohort";
import { promotionOverview } from "@/lib/promotion";
import { CreateSection } from "./CreateSection";
import { PromotionPanel } from "./PromotionPanel";
import { SectionCard, type SectionView, type TeacherOption } from "./SectionCard";

export const metadata = { title: "Sections" };

export default async function AdminSectionsPage() {
  await requireRole("admin");
  await dbConnect();

  const [sectionDocs, teacherDocs, memberCounts, promotion] = await Promise.all([
    Section.find()
      .populate("teachers", "name email")
      .lean(),
    User.find({ role: "teacher", status: "approved" })
      .select("name email")
      .sort({ name: 1 })
      .lean(),
    User.aggregate<{ _id: string | null; count: number }>([
      { $match: { role: "student", status: "approved" } },
      { $group: { _id: "$section", count: { $sum: 1 } } },
    ]),
    promotionOverview(),
  ]);

  const counts = new Map(memberCounts.map((row) => [String(row._id), row.count]));
  const teachers = plain(teacherDocs as unknown as TeacherOption[]);

  type RawSection = {
    _id: unknown;
    name: string;
    year?: string;
    dpYear?: string;
    gradYear?: number;
    teachers?: TeacherOption[];
  };
  const sections: SectionView[] = plain(sectionDocs as unknown as RawSection[])
    .map((s) => {
      const { gradYear, dpYear, academicYear, stage } = describeSection(s);
      return {
        _id: String(s._id),
        name: s.name,
        gradYear,
        dpYear,
        academicYear,
        stage,
        teachers: s.teachers ?? [],
      };
    })
    // Newest cohort first, then by name.
    .sort((a, b) => b.gradYear - a.gradYear || a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sections</h1>
        <p className="mt-1 text-sm text-muted">
          A section groups students with the teachers who review their work.
        </p>
      </div>

      <PromotionPanel data={promotion} />

      <CreateSection />

      {sections.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">
          No sections yet. Create your first one above.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sections.map((section) => (
            <SectionCard
              key={section._id}
              section={section}
              teachers={teachers}
              studentCount={counts.get(section._id) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
