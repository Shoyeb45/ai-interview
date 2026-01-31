import LiveInterviewWrapper from "./LiveInterviewWrapper";

export default async function LiveInterviewPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;
  return <LiveInterviewWrapper interviewId={interviewId} />;
}