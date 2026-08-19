import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { academicYears } from "@/lib/constants";
import { advisorOptions } from "@/lib/queries";
import { ExperienceForm } from "@/components/ExperienceForm";

export const metadata = { title: "New CAS experience" };

export default async function NewExperiencePage() {
  const user = await requireRole("student");
  if (user.graduated) redirect("/my-cas");
  const teachers = await advisorOptions(user.sectionId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New CAS experience</h1>
        <p className="mt-1 text-sm text-muted">
          Step 1 is the proposal form. Step 2 is your reflection blog — you need
          a header image before you can submit it for review.
        </p>
      </div>

      <ExperienceForm years={academicYears()} teachers={teachers} />
    </div>
  );
}
