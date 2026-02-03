"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import { getMySessions, type MySessionItem } from "@/lib/userApi";
import { getDecisionColor } from "@/lib/getDecisionColor";
import { HiringDecision } from "@/types/schema";

const statusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  ABANDONED: "bg-red-50 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  CHEATED: "bg-red-100 text-red-800",
};

export default function CandidateSessionsPage() {
  const [sessions, setSessions] = useState<MySessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getMySessions();
      setSessions(list);
    } catch {
      setSessions([]);
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
        <h1 className="text-2xl font-bold text-gray-900">My Sessions</h1>
        <p className="text-gray-600 mt-1">Interview attempts and status</p>
      </div>

      <div className="space-y-4">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-900">
                  {s.interviewAgent?.title ?? `Interview #${s.interviewAgent?.id}`}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">{s.interviewAgent?.role ?? ""}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {s.startedAt ? new Date(s.startedAt).toLocaleDateString() : "Not started"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {s.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {s.overallResult && (
                  <>
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${getDecisionColor(s.overallResult.decision as HiringDecision)}`}>
                      {s.overallResult.decision}
                    </span>
                    <span className="text-lg font-bold text-gray-900">{s.overallResult.overallScore}%</span>
                  </>
                )}
                {s.status === "PENDING" && (
                  <Link
                    href={`/interview/${s.id}/live`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm"
                  >
                    Start
                  </Link>
                )}
                {s.status === "COMPLETED" && s.overallResult && (
                  <Link
                    href={`/interview/${s.id}/result`}
                    className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 text-sm"
                  >
                    View result
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-600 font-medium">No sessions yet</p>
          <p className="text-gray-500 text-sm mt-1">Start an interview from Available Interviews</p>
          <Link
            href="/interview"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Browse interviews
          </Link>
        </div>
      )}
    </div>
  );
}
