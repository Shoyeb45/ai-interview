"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Clock, Building2, User, ArrowRight, ArrowLeft } from "lucide-react";
import { getPublishedInterviewAgents } from "@/lib/mockApi";
import type { InterviewAgent } from "@/types/schema";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";

export default function InterviewListPage() {
  const { isHiringManager } = useAuth();
  const [agents, setAgents] = useState<InterviewAgent[]>([]);
  const [loading, setLoading] = useState(true);

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
            <p className="text-gray-600 mt-1">Choose an interview to view details and start</p>
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
                  {(agent.createdBy?.name || agent.companyName) && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                      {agent.createdBy?.name && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-4 w-4 text-gray-400" />
                          {agent.createdBy.name}
                        </span>
                      )}
                      {agent.companyName && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          {agent.companyName}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                    <Briefcase className="h-4 w-4" />
                    <span>{agent.totalQuestions} questions</span>
                    <span className="text-gray-400">·</span>
                    <Clock className="h-4 w-4" />
                    <span>{agent.estimatedDuration} min</span>
                  </div>
                  <p className="mt-3 text-sm text-gray-600 line-clamp-2">{agent.jobDescription}</p>
                  <div className="mt-4">
                    <Link
                      href={`/interview/start/${agent.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                    >
                      View details & start
                      <ArrowRight className="h-4 w-4" />
                    </Link>
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
