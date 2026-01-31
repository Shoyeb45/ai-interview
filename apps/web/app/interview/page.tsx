"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, Clock, Play, ArrowLeft } from "lucide-react";
import { getPublishedInterviewAgents, startSession } from "@/lib/mockApi";
import type { InterviewAgent } from "@/types/schema";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function InterviewListPage() {
  const router = useRouter();
  const { isHiringManager } = useAuth();
  const [agents, setAgents] = useState<InterviewAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getPublishedInterviewAgents();
      setAgents(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStart = async (agentId: number) => {
    setStartingId(agentId);
    try {
      const session = await startSession(agentId);
      toast.success("Session started");
      router.push(`/interview/${session.interviewId}/live`);
    } catch {
      toast.error("Failed to start session");
      setStartingId(null);
    }
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <Link
            href={isHiringManager ? "/dashboard/hiring-manager" : "/dashboard/candidate"}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Available Interviews</h1>
            <p className="text-gray-600 mt-1">Choose an interview to start</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-gray-500">Loading...</span>
            </div>
          ) : agents.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No interviews available</p>
              <p className="text-gray-500 text-sm mt-1">Check back later for published interviews</p>
              <Link
                href="/dashboard/candidate"
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Back to dashboard
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <h2 className="font-semibold text-gray-900">{agent.title}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{agent.role}</p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                    <Briefcase className="h-4 w-4" />
                    <span>{agent.totalQuestions} questions</span>
                    <span className="text-gray-400">·</span>
                    <Clock className="h-4 w-4" />
                    <span>{agent.estimatedDuration} min</span>
                  </div>
                  <p className="mt-3 text-sm text-gray-600 line-clamp-2">{agent.jobDescription}</p>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => handleStart(agent.id)}
                      disabled={startingId != null}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Play className="h-4 w-4" />
                      {startingId === agent.id ? "Starting..." : "Start interview"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
