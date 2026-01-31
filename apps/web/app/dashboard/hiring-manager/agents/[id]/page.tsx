"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Briefcase, Clock, Users, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getInterviewAgentById, deleteInterviewAgent } from "@/lib/mockApi";
import type { InterviewAgent } from "@/types/schema";
const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PUBLISHED: "bg-green-100 text-green-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
  CLOSED: "bg-red-50 text-red-700",
  ARCHIVED: "bg-gray-100 text-gray-600",
};

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [agent, setAgent] = useState<InterviewAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!agent) return;
    if (!confirm(`Delete "${agent.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteInterviewAgent(agent.id);
      toast.success("Interview agent deleted");
      router.push("/dashboard/hiring-manager/agents");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete agent";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }, [agent, router]);

  const load = useCallback(async () => {
    if (!id || isNaN(id)) return;
    setLoading(true);
    try {
      const data = await getInterviewAgentById(id);
      setAgent(data ?? null);
    } finally {
      setLoading(false);
    }
  }, [id]);

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
        <Link href="/dashboard/hiring-manager/agents" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to agents
        </Link>
        <p className="text-gray-600">Agent not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/dashboard/hiring-manager/agents"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to agents
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{agent.title}</h1>
              <p className="text-gray-600 mt-1">{agent.role}</p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${statusColors[agent.status] ?? "bg-gray-100 text-gray-600"}`}>
              {agent.status}
            </span>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Briefcase className="h-5 w-5 text-gray-400" />
              <span>{agent.totalQuestions} questions</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-5 w-5 text-gray-400" />
              <span>{agent.estimatedDuration} min</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="h-5 w-5 text-gray-400" />
              <span>{agent._count?.sessions ?? 0} sessions</span>
            </div>
            {agent.deadline && (
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-5 w-5 text-gray-400" />
                <span>Deadline: {new Date(agent.deadline).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Experience level</h3>
            <p className="text-gray-900">{agent.experienceLevel}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Focus areas</h3>
            <div className="flex flex-wrap gap-2">
              {agent.focusAreas.map((a) => (
                <span key={a} className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-lg text-sm">
                  {a}
                </span>
              ))}
            </div>
          </div>
          {agent.openingMessage && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Opening message</h3>
              <p className="text-gray-700 whitespace-pre-wrap text-sm">{agent.openingMessage}</p>
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Job description</h3>
            <p className="text-gray-700 whitespace-pre-wrap text-sm">{agent.jobDescription.substring(0, 200) + '.....'}</p>
          </div>
        </div>
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-3">
          <Link
            href={`/dashboard/hiring-manager/agents/${agent.id}/edit`}
            className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50"
          >
            Edit agent
          </Link>
          <Link
            href={`/dashboard/hiring-manager/agents/${agent.id}/leaderboard`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Leaderboard
          </Link>
          <Link
            href="/dashboard/hiring-manager/agents"
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to list
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 border border-red-600 text-red-600 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete agent
          </button>
        </div>
      </div>
    </div>
  );
}
