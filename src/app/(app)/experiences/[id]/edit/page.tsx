import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { academicYears } from "@/lib/constants";
import { advisorOptions, experienceDetail } from "@/lib/queries";
import { ExperienceForm } from "@/components/ExperienceForm";

export const metadata = { title: "Edit CAS experience" };

export default async function EditExperiencePage(
  props: PageProps<"/experiences/[id]/edit">,
) {
  const user = await requireRole("student");
  const { id } = await props.params;
  const experience = await experienceDetail(id);

  if (!experience) notFound();
  if (experience.student._id !== user.id) redirect("/my-cas");
  if (experience.status === "pending" || experience.status === "approved") {
    redirect(`/experiences/${id}`);
  }

  const teachers = await advisorOptions(user.sectionId);
  const lastNote = experience.reviewNotes.at(-1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit CAS experience</h1>
        <p className="mt-1 text-sm text-muted">{experience.title}</p>
      </div>

      {experience.status === "rejected" && lastNote?.comment && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft p-4">
          <p className="text-sm font-semibold text-danger">
            {lastNote.teacherName} asked for changes
          </p>
          <p className="mt-1 whitespace-pre-line text-sm">{lastNote.comment}</p>
        </div>
      )}

      <ExperienceForm
        years={academicYears()}
        teachers={teachers}
        experienceId={id}
        startStep={experience.status === "rejected" ? 2 : 1}
        initial={{
          year: experience.year,
          term: experience.term,
          title: experience.title,
          description: experience.description,
          strands: experience.strands,
          location: experience.location,
          fromDate: experience.fromDate as unknown as string,
          toDate: experience.toDate as unknown as string,
          learningOutcomes: experience.learningOutcomes,
          sdgs: experience.sdgs,
          investigation: experience.investigation,
          learnerProfileAttributes: experience.learnerProfileAttributes,
          learnerProfileNote: experience.learnerProfileNote ?? "",
          supervisor: experience.supervisor ?? "",
          casAdvisor: experience.casAdvisor?._id ?? "",
          stage: experience.stage,
          blogTitle: experience.blogTitle ?? "",
          blogBody: experience.blogBody ?? "",
          headerImage: experience.headerImage ?? null,
          images: experience.images ?? [],
        }}
      />
    </div>
  );
}
