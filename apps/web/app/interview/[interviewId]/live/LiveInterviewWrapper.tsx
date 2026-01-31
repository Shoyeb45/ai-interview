"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import VoiceChat from "@/components/interview";
import {
  INTERVIEW_CONTEXT_STORAGE_KEY,
  type InterviewContext,
} from "@/lib/interviewApi";

export default function LiveInterviewWrapper({
  interviewId,
}: {
  interviewId: string;
}) {
  const [context, setContext] = useState<InterviewContext | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(INTERVIEW_CONTEXT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as InterviewContext;
        setContext(parsed);
      }
    } catch {
      setContext(null);
    }
  }, []);

  return (
    <ProtectedRoute>
      <div className="fixed inset-0 w-full h-full overflow-hidden bg-slate-50">
        <VoiceChat interviewId={interviewId} context={context} />
      </div>
    </ProtectedRoute>
  );
}
