"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Building2, Briefcase, Clock, Play, AlertCircle, Home } from "lucide-react";
import {
  getInterviewAgentByIdForCandidate,
  getMyAttemptCountForAgent,
  startSession,
} from "@/lib/mockApi";
import type { InterviewAgent, ExperienceLevel } from "@/types/schema";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";

const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  INTERN: "Intern",
  ENTRY_LEVEL: "Entry Level",
  JUNIOR: "Junior (1–2 years)",
  MID_LEVEL: "Mid Level (3–5 years)",
  SENIOR: "Senior (5+ years)",
  LEAD: "Lead",
  PRINCIPAL: "Principal",
};

export default function InterviewStartPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = Number(params.agentId);
  const [agent, setAgent] = useState<InterviewAgent | null>(null);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [readyChecked, setReadyChecked] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!agentId || isNaN(agentId)) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const [agentData, count] = await Promise.all([
        getInterviewAgentByIdForCandidate(agentId),
        getMyAttemptCountForAgent(agentId),
      ]);
      setAgent(agentData ?? null);
      setAttemptCount(count);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStart = async () => {
    if (!agent || !readyChecked) return;
    setStarting(true);
    setErrorMessage(null);
    try {
      const session = await startSession(agent.id);
      router.push(`/interview/${session.interviewId}/live`);
    } catch (err) {
      setStarting(false);
      const message = err instanceof Error ? err.message : "Failed to start interview. Please try again.";
      setErrorMessage(message);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppShell>
          <div className="flex items-center justify-center py-12">
            <span className="text-gray-500">Loading...</span>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (!agent) {
    return (
      <ProtectedRoute>
        <AppShell>
          <div className="space-y-4">
            <Link href="/interview" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
              <ArrowLeft className="h-4 w-4" />
              Back to available interviews
            </Link>
            <p className="text-gray-600">Interview not found or no longer available.</p>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (errorMessage) {
    return (
      <ProtectedRoute>
        <AppShell>
          <div className="max-w-md mx-auto py-12 px-4 text-center">
            <div className="rounded-xl border border-red-200 bg-red-50 p-6">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-red-900 mb-2">Could not start interview</h2>
              <p className="text-red-700 text-sm mb-6">{errorMessage}</p>
              <Link
                href="/dashboard/candidate"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
              >
                <Home className="h-4 w-4" />
                Go to home
              </Link>
            </div>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="max-w-2xl mx-auto space-y-6">
          <Link
            href="/interview"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to available interviews
          </Link>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h1 className="text-2xl font-bold text-gray-900">{agent.title}</h1>
              <p className="text-gray-600 mt-1">{agent.role}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                {agent.createdBy?.name && (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-4 w-4 text-gray-400" />
                    {agent.createdBy.name}
                  </span>
                )}
                {agent.companyName && (
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    {agent.companyName}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  {EXPERIENCE_LABELS[agent.experienceLevel] ?? agent.experienceLevel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-gray-400" />
                  {agent.totalQuestions} questions · ~{agent.estimatedDuration} min
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Job description</h2>
                <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {agent.jobDescription}
                </p>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-gray-500 font-medium">Hiring manager</dt>
                  <dd className="text-gray-900 mt-0.5">{agent.createdBy?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Company</dt>
                  <dd className="text-gray-900 mt-0.5">{agent.companyName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Role</dt>
                  <dd className="text-gray-900 mt-0.5">{agent.role}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Experience level</dt>
                  <dd className="text-gray-900 mt-0.5">
                    {EXPERIENCE_LABELS[agent.experienceLevel] ?? agent.experienceLevel}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Total questions</dt>
                  <dd className="text-gray-900 mt-0.5">{agent.totalQuestions}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Estimated duration</dt>
                  <dd className="text-gray-900 mt-0.5">{agent.estimatedDuration} minutes</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-gray-500 font-medium">Focus areas</dt>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    {(agent.focusAreas ?? []).map((area) => (
                      <span
                        key={area}
                        className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs"
                      >
                        {area}
                      </span>
                    ))}
                    {(!agent.focusAreas || agent.focusAreas.length === 0) && "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Your attempts</dt>
                  <dd className="text-gray-900 mt-0.5">
                    {attemptCount} {attemptCount === 1 ? "attempt" : "attempts"} so far
                  </dd>
                </div>
              </dl>

              <div className="pt-4 border-t border-gray-100">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={readyChecked}
                    onChange={(e) => setReadyChecked(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    I am ready to start the interview. I understand the format and will complete it to the best of my ability.
                  </span>
                </label>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleStart}
                disabled={starting || !readyChecked}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="h-5 w-5" />
                {starting ? "Starting interview..." : "Start interview"}
              </button>
              <Link
                href="/interview"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
