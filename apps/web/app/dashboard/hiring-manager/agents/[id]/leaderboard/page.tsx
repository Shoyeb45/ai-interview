"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, Users, ChevronRight } from "lucide-react";
import { getInterviewAgentById, getSessionsByAgentId } from "@/lib/mockApi";
import type { InterviewAgent, CandidateInterviewSession } from "@/types/schema";
import { getDecisionColor } from "@/lib/getDecisionColor";

type LeaderboardRow = {
  candidateId: number;
  name: string;
  email: string;
  attempts: number;
  completedAttempts: number;
  bestScore: number;
  latestDecision: string | null;
  latestCompletedAt: string | null;
};

function buildLeaderboard(sessions: CandidateInterviewSession[]): LeaderboardRow[] {
  const byCandidate = new Map<
    number,
    { name: string; email: string; sessions: CandidateInterviewSession[] }
  >();
  for (const s of sessions) {
    const c = s.candidate;
    const name = c?.name ?? `Candidate ${s.candidateId}`;
    const email = c?.email ?? "";
    if (!byCandidate.has(s.candidateId)) {
      byCandidate.set(s.candidateId, { name, email, sessions: [] });
    }
    byCandidate.get(s.candidateId)!.sessions.push(s);
  }
  const rows: LeaderboardRow[] = [];
  for (const [candidateId, { name, email, sessions }] of byCandidate) {
    const withResult = sessions.filter((s) => s.overallResult != null);
    const bestScore =
      withResult.length > 0
        ? Math.max(...withResult.map((s) => s.overallResult!.overallScore))
        : 0;
    const latest = withResult.sort(
      (a, b) =>
        new Date((b.completedAt ?? b.updatedAt) ?? 0).getTime() -
        new Date((a.completedAt ?? a.updatedAt) ?? 0).getTime()
    )[0];
    rows.push({
      candidateId,
      name,
      email,
      attempts: sessions.length,
      completedAttempts: withResult.length,
      bestScore,
      latestDecision: latest?.overallResult?.decision ?? null,
      latestCompletedAt: latest?.completedAt ?? null,
    });
  }
  rows.sort((a, b) => b.bestScore - a.bestScore);
  return rows;
}

export default function LeaderboardPage() {
  const params = useParams();
  const id = Number(params.id);
  const [agent, setAgent] = useState<InterviewAgent | null>(null);
  const [sessions, setSessions] = useState<CandidateInterviewSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id || isNaN(id)) return;
    setLoading(true);
    try {
      const [agentData, sessionsData] = await Promise.all([
        getInterviewAgentById(id),
        getSessionsByAgentId(id),
      ]);
      setAgent(agentData ?? null);
      setSessions(sessionsData);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const leaderboard = useMemo(() => buildLeaderboard(sessions), [sessions]);

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
          href="/dashboard/hiring-manager/agents"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to agents
        </Link>
        <p className="text-gray-600">Agent not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/hiring-manager/agents/${id}`}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {agent.title}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="h-7 w-7 text-amber-500" />
          Leaderboard
        </h1>
        <p className="text-gray-600 mt-1">
          {agent.title} — candidates ranked by best score
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {leaderboard.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p>No candidates have attempted this interview yet.</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-700 w-12">#</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Candidate</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Attempts</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Best score</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Latest decision</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Last completed</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, index) => (
                <tr
                  key={row.candidateId}
                  className="border-b border-gray-100 hover:bg-gray-50/50"
                >
                  <td className="py-3 px-4 font-bold text-gray-900">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{row.name}</div>
                    <div className="text-sm text-gray-500">{row.email}</div>
                  </td>
                  <td className="py-3 px-4 text-center text-gray-700">
                    {row.completedAttempts} / {row.attempts}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-semibold text-gray-900">{row.bestScore}%</span>
                  </td>
                  <td className="py-3 px-4">
                    {row.latestDecision ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getDecisionColor(
                          row.latestDecision as Parameters<typeof getDecisionColor>[0]
                        )}`}
                      >
                        {row.latestDecision}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {row.latestCompletedAt
                      ? new Date(row.latestCompletedAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/dashboard/hiring-manager/agents/${id}/candidates/${row.candidateId}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      View attempts
                      <ChevronRight className="h-4 w-4" />
                    </Link>
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
