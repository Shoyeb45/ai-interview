"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import { getMySessions } from "@/lib/mockApi";
import type { CandidateInterviewSession } from "@/types/schema";
import { getDecisionColor } from "@/lib/getDecisionColor";

export default function CandidateResultsListPage() {
  const [sessions, setSessions] = useState<CandidateInterviewSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getMySessions();
      setSessions(list.filter((s) => s.overallResult != null));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Results</h1>
        <p className="text-gray-600 mt-1">Interview feedback and scores</p>
      </div>

      <div className="space-y-4">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-900">
                  {s.interviewAgent?.title ?? `Interview #${s.interviewAgentId}`}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {s.completedAt ? new Date(s.completedAt).toLocaleString() : "—"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {s.overallResult && (
                  <>
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${getDecisionColor(s.overallResult.decision)}`}>
                      {s.overallResult.decision}
                    </span>
                    <span className="text-xl font-bold text-gray-900">{s.overallResult.overallScore}%</span>
                    <Link
                      href={`/dashboard/candidate/results/${s.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm"
                    >
                      View details
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-600 font-medium">No results yet</p>
          <p className="text-gray-500 text-sm mt-1">Complete an interview to see feedback here</p>
          <Link
            href="/interview"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Start an interview
          </Link>
        </div>
      )}
    </div>
  );
}
