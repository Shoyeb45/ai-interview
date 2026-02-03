import LiveInterviewWrapper from "./LiveInterviewWrapper";

export default async function LiveInterviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <LiveInterviewWrapper sessionId={sessionId} />;
}
