"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Target, TrendingUp, Clock, ArrowRight, Award } from "lucide-react";
import { getMyMetrics } from "@/lib/mockApi";
import type { UserMetrics } from "@/types/schema";

export default function CandidateDashboardPage() {
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyMetrics();
      setMetrics(data);
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

  if (!metrics) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-gray-600 mt-1">Track your practice and results</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Interviews</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalInterviews}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.completedInterviews}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.averageScore}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Practice Time</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalPracticeTime} min</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Award className="h-5 w-5 text-green-600" />
            Strongest Skills
          </h2>
          <ul className="mt-3 space-y-2">
            {metrics.strongestSkills.length ? (
              metrics.strongestSkills.map((s, i) => (
                <li key={i} className="text-gray-700 flex items-center gap-2">
                  <span className="text-green-500">✓</span> {s}
                </li>
              ))
            ) : (
              <li className="text-gray-500 text-sm">Complete interviews to see strengths</li>
            )}
          </ul>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-600" />
            Needs Work
          </h2>
          <ul className="mt-3 space-y-2">
            {metrics.needsWorkSkills.length ? (
              metrics.needsWorkSkills.map((s, i) => (
                <li key={i} className="text-gray-700 flex items-center gap-2">
                  <span className="text-amber-500">→</span> {s}
                </li>
              ))
            ) : (
              <li className="text-gray-500 text-sm">Keep practicing to get recommendations</li>
            )}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link
          href="/interview"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Browse Available Interviews
          <ArrowRight className="h-5 w-5" />
        </Link>
        <Link
          href="/dashboard/candidate/sessions"
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          My Sessions
        </Link>
        <Link
          href="/dashboard/candidate/results"
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          My Results
        </Link>
      </div>
    </div>
  );
}
