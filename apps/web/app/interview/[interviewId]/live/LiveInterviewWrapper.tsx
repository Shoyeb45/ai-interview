"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [context, setContext] = useState<InterviewContext | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(INTERVIEW_CONTEXT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as InterviewContext;
        setContext(parsed);
      } else {
        setContext(null);
      }
    } catch {
      setContext(null);
    } finally {
      setChecked(true);
    }
  }, []);

  if (!checked) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <span className="text-slate-500">Loading...</span>
        </div>
      </ProtectedRoute>
    );
  }

  if (!context?.sessionId) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4 px-4">
          <p className="text-slate-700 text-center">
            Missing session. Please start the interview from the interview page.
          </p>
          <button
            onClick={() => router.push("/interview")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Go to interviews
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="fixed inset-0 w-full h-full overflow-hidden bg-slate-50">
        <VoiceChat interviewId={interviewId} context={context} />
      </div>
    </ProtectedRoute>
  );
}
