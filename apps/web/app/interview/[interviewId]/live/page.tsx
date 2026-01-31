import LiveInterviewWrapper from "./LiveInterviewWrapper";

export default async function LiveInterviewPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  await params;
  return <LiveInterviewWrapper />;
}