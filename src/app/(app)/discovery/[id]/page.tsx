import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { experienceDetail } from "@/lib/queries";
import { BlogView } from "@/components/BlogView";
import { ProposalFacts } from "@/components/ProposalFacts";

export const metadata = { title: "Reflection" };

export default async function DiscoveryPostPage(
  props: PageProps<"/discovery/[id]">,
) {
  await requireUser();
  const { id } = await props.params;
  const experience = await experienceDetail(id);

  // Only approved reflections are published to Discovery.
  if (!experience || experience.status !== "approved") notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/discovery" className="text-sm font-semibold text-brand hover:underline">
        ← Discovery
      </Link>

      <BlogView
        headerImage={experience.headerImage}
        blogTitle={experience.blogTitle}
        blogBody={experience.blogBody}
        images={experience.images}
        strands={experience.strands}
        authorName={experience.student.name}
        authorImage={experience.student.image}
        publishedAt={experience.reviewedAt ?? experience.submittedAt}
      />

      <ProposalFacts
        year={experience.year}
        term={experience.term}
        location={experience.location}
        stage={experience.stage}
        fromDate={experience.fromDate}
        toDate={experience.toDate}
        strands={experience.strands}
        learningOutcomes={experience.learningOutcomes}
        sdgs={experience.sdgs}
        description={experience.description}
        investigation={experience.investigation}
        learnerProfileAttributes={experience.learnerProfileAttributes}
        learnerProfileNote={experience.learnerProfileNote}
        supervisor={experience.supervisor}
        advisorName={experience.casAdvisor?.name}
      />
    </div>
  );
}
