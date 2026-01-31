"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { getInterviewAgentById, getSessionsByAgentAndCandidate } from "@/lib/mockApi";
import type { InterviewAgent, CandidateInterviewSession } from "@/types/schema";
import { getDecisionColor } from "@/lib/getDecisionColor";

export default function CandidateAttemptsPage() {
  const params = useParams();
  const agentId = Number(params.id);
  const candidateId = Number(params.candidateId);
  const [agent, setAgent] = useState<InterviewAgent | null>(null);
  const [sessions, setSessions] = useState<CandidateInterviewSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!agentId || !candidateId || isNaN(agentId) || isNaN(candidateId)) return;
    setLoading(true);
    try {
      const [agentData, sessionsData] = await Promise.all([
        getInterviewAgentById(agentId),
        getSessionsByAgentAndCandidate(agentId, candidateId),
      ]);
      setAgent(agentData ?? null);
      setSessions(sessionsData);
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

  const candidateName =
    sessions[0]?.candidate?.name ?? `Candidate ${candidateId}`;
  const candidateEmail = sessions[0]?.candidate?.email ?? "";

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
        {sessions.length === 0 ? (
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
              {sessions.map((s, index) => (
                <tr
                  key={s.id}
                  className="border-b border-gray-100 hover:bg-gray-50/50"
                >
                  <td className="py-3 px-4 font-medium text-gray-900">
                    Attempt {index + 1}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        s.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : s.status === "IN_PROGRESS"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {s.completedAt
                      ? new Date(s.completedAt).toLocaleString()
                      : s.startedAt
                      ? new Date(s.startedAt).toLocaleString()
                      : new Date(s.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    {s.overallResult ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getDecisionColor(
                          s.overallResult.decision
                        )}`}
                      >
                        {s.overallResult.decision}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">
                    {s.overallResult ? `${s.overallResult.overallScore}%` : "—"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {s.overallResult && (
                      <Link
                        href={`/dashboard/hiring-manager/agents/${agentId}/results/${s.id}`}
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
