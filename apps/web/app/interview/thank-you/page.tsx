"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Home } from "lucide-react";

export default function ThankYouPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/interview");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 md:p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 mb-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Interview Completed!
          </h1>
          
          <p className="text-lg text-slate-600 mb-6">
            Thank you for taking the time to complete this interview.
          </p>

          <div className="bg-blue-50 rounded-lg p-6 mb-8 border border-blue-100">
            <p className="text-slate-700 mb-2">
              Your responses have been recorded and are being evaluated.
            </p>
            <p className="text-slate-600 text-sm">
              You'll receive feedback and results once the evaluation is complete.
            </p>
          </div>

          {sessionId && (
            <div className="mb-8 text-sm text-slate-500">
              Session ID: <span className="font-mono font-medium text-slate-700">{sessionId}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => router.push("/interview")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Home className="w-4 h-4" />
              Go to Interviews
            </button>
            
            {sessionId && (
              <button
                onClick={() => router.push(`/interview/${sessionId}/result`)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors border border-slate-200"
              >
                View Result
              </button>
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-slate-200">
            <p className="text-slate-500 text-sm">
              Redirecting to interviews in <span className="font-bold text-blue-600 text-lg">{countdown}</span> {countdown === 1 ? "second" : "seconds"}...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
