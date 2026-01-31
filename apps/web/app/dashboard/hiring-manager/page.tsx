"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Plus, Users, ArrowRight } from "lucide-react";
import { getInterviewAgents } from "@/lib/mockApi";
import type { InterviewAgent } from "@/types/schema";
import { getDecisionColor } from "@/lib/getDecisionColor";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PUBLISHED: "bg-green-100 text-green-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
  CLOSED: "bg-red-50 text-red-700",
  ARCHIVED: "bg-gray-100 text-gray-600",
};

export default function HiringManagerDashboardPage() {
  const [agents, setAgents] = useState<InterviewAgent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getInterviewAgents();
      setAgents(list);
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hiring Manager Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage interview agents and view candidate sessions</p>
        </div>
        <Link
          href="/dashboard/hiring-manager/agents/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          New Interview Agent
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-gray-900 truncate">{agent.title}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{agent.role}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[agent.status] ?? "bg-gray-100 text-gray-600"}`}>
                {agent.status}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <Briefcase className="h-4 w-4" />
              <span>{agent.totalQuestions} questions</span>
              <span className="text-gray-400">·</span>
              <span>{agent.estimatedDuration} min</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{agent.sessions?.length ?? 0} sessions</span>
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/dashboard/hiring-manager/agents/${agent.id}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                View
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={`/dashboard/hiring-manager/agents/${agent.id}/leaderboard`}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Leaderboard
              </Link>
            </div>
          </div>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No interview agents yet</p>
          <p className="text-gray-500 text-sm mt-1">Create one to start collecting candidate sessions</p>
          <Link
            href="/dashboard/hiring-manager/agents/new"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Create Interview Agent
          </Link>
        </div>
      )}
    </div>
  );
}
