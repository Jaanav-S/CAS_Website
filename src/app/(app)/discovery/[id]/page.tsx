import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { experienceDetail } from "@/lib/queries";
import { canModerate } from "@/lib/scope";
import { BlogView } from "@/components/BlogView";
import { ProposalFacts } from "@/components/ProposalFacts";
import { TakedownButton } from "@/components/TakedownButton";

export const metadata = { title: "Reflection" };

export default async function DiscoveryPostPage(
  props: PageProps<"/discovery/[id]">,
) {
  const user = await requireUser();
  const { id } = await props.params;
  const experience = await experienceDetail(id);

  // Only approved reflections are published to Discovery.
  if (!experience || experience.status !== "approved") notFound();

  const moderator = await canModerate(
    user,
    experience.section?._id,
    experience.student.section,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link
          href="/discovery"
          className="text-sm font-semibold text-brand hover:underline"
        >
          ← Discovery
        </Link>
        {moderator && <TakedownButton id={id} redirectTo="/discovery" />}
      </div>

      <BlogView
        headerImage={experience.headerImage}
        headerWidth={experience.headerWidth}
        headerHeight={experience.headerHeight}
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
