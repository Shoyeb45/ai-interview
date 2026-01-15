import VoiceChat from "@/components/interview";

export default async function page({
    params
}:  {
    params: Promise<{ interviewId : string}>
}) {
    
    const interviewId = (await params).interviewId;

    return (<div>
        <VoiceChat></VoiceChat>
    </div>)
}