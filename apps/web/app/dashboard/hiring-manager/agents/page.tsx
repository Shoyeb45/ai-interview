"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Plus, Users } from "lucide-react";
import { getInterviewAgents } from "@/lib/mockApi";
import type { InterviewAgent } from "@/types/schema";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PUBLISHED: "bg-green-100 text-green-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
  CLOSED: "bg-red-50 text-red-700",
  ARCHIVED: "bg-gray-100 text-gray-600",
};

export default function HiringManagerAgentsPage() {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interview Agents</h1>
          <p className="text-gray-600 mt-1">Templates candidates take interviews from</p>
        </div>
        <Link
          href="/dashboard/hiring-manager/agents/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          New Agent
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white rounded-xl border border-gray-200 shadow-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-4 font-medium text-gray-700">Title</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Role</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Questions</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Sessions</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="py-3 px-4 font-medium text-gray-900">{agent.title}</td>
                <td className="py-3 px-4 text-gray-600">{agent.role}</td>
                <td className="py-3 px-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[agent.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {agent.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-600">{agent.totalQuestions}</td>
                <td className="py-3 px-4 text-gray-600">{agent._count?.sessions ?? 0}</td>
                <td className="py-3 px-4 text-right">
                  <Link
                    href={`/dashboard/hiring-manager/agents/${agent.id}`}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    View
                  </Link>
                  <span className="mx-2 text-gray-300">|</span>
                  <Link
                    href={`/dashboard/hiring-manager/agents/${agent.id}/leaderboard`}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Leaderboard
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {agents.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No interview agents yet</p>
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
