"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { getInterviewAgentById } from "@/lib/mockApi";
import apiClient from "@/lib/apiClient";
import type { InterviewAgent } from "@/types/schema";
import { getDecisionColor } from "@/lib/getDecisionColor";

interface UserAttempt {
  attemptNumber: number;
  sessionId: number;
  status: string;
  date: string;
  decision: string | null;
  score: number | null;
  interviewResultId: number | null;
  startedAt: string | null;
  completedAt: string | null;
  abandonedAt: string | null;
}

export default function CandidateAttemptsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const agentId = Number(params.id);
  const candidateId = Number(params.candidateId);
  const [agent, setAgent] = useState<InterviewAgent | null>(null);
  const [attempts, setAttempts] = useState<UserAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  const candidateName = searchParams.get("name") ?? `Candidate ${candidateId}`;
  const candidateEmail = searchParams.get("email") ?? "";

  const load = useCallback(async () => {
    if (!agentId || !candidateId || isNaN(agentId) || isNaN(candidateId)) return;
    setLoading(true);
    try {
      const [agentData, attemptsData] = await Promise.all([
        getInterviewAgentById(agentId),
        apiClient.get<UserAttempt[]>(
          `/interview-result/${agentId}/attempts/${candidateId}`
        ),
      ]);
      setAgent(agentData ?? null);
      setAttempts(Array.isArray(attemptsData) ? attemptsData : []);
    } catch {
      setAttempts([]);
    } finally {
      setLoading(false);
    }
  }, [agentId, candidateId]);

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

  if (!agent) {
    return (
      <div className="space-y-4">
        <Link
          href={`/dashboard/hiring-manager/agents/${agentId}/leaderboard`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to leaderboard
        </Link>
        <p className="text-gray-600">Agent not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/hiring-manager/agents/${agentId}/leaderboard`}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to leaderboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attempts</h1>
        <p className="text-gray-600 mt-1">
          {candidateName}
          {candidateEmail && ` — ${candidateEmail}`}
        </p>
        <p className="text-sm text-gray-500 mt-0.5">{agent.title}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {attempts.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p>No attempts for this candidate.</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Attempt</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Decision</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Score</th>
                <th className="w-28" />
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr
                  key={a.sessionId}
                  className="border-b border-gray-100 hover:bg-gray-50/50"
                >
                  <td className="py-3 px-4 font-medium text-gray-900">
                    Attempt {a.attemptNumber}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        a.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : a.status === "IN_PROGRESS"
                          ? "bg-blue-100 text-blue-800"
                          : a.status === "ABANDONED"
                          ? "bg-amber-100 text-amber-800"
                          : a.status === "CHEATED"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {a.completedAt
                      ? new Date(a.completedAt).toLocaleString()
                      : a.startedAt
                      ? new Date(a.startedAt).toLocaleString()
                      : new Date(a.date).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    {a.decision ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getDecisionColor(
                          a.decision as Parameters<typeof getDecisionColor>[0]
                        )}`}
                      >
                        {a.decision}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">
                    {a.score != null ? `${a.score}%` : "—"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {a.interviewResultId && (
                      <Link
                        href={`/dashboard/hiring-manager/agents/${agentId}/results/${a.sessionId}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        View report
                        <ArrowLeft className="h-4 w-4 rotate-180" />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
