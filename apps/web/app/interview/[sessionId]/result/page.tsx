"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSessionResult, InterviewResult } from "@/lib/userApi";
import { ArrowLeft, TrendingUp, BookOpen, Award, Target, Lightbulb } from "lucide-react";
import { toast } from "sonner";

export default function InterviewResultPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = Number(params.sessionId);
  const [result, setResult] = useState<InterviewResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResult() {
      if (!sessionId || isNaN(sessionId)) {
        toast.error("Invalid session ID");
        router.push("/interview");
        return;
      }

      try {
        const data = await getSessionResult(sessionId);
        if (!data) {
          toast.error("Result not found. Please try again later.");
          router.push("/interview");
          return;
        }
        setResult(data);
      } catch (error) {
        console.error("Error loading result:", error);
        toast.error("Failed to load result");
        router.push("/interview");
      } finally {
        setLoading(false);
      }
    }

    loadResult();
  }, [sessionId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <p className="text-slate-600">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">No result available</p>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 60) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 40) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.push("/interview")}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Interviews
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8 text-white">
            <h1 className="text-3xl font-bold mb-2">Interview Results</h1>
            <p className="text-blue-100">Session #{sessionId}</p>
          </div>

          {/* Overall Score */}
          <div className="px-8 py-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-700 mb-1">Overall Score</h2>
                <p className="text-slate-500 text-sm">Your aggregate performance</p>
              </div>
              <div className={`text-5xl font-bold ${getScoreColor(result.overallScore)} px-6 py-3 rounded-xl border-2`}>
                {result.overallScore}%
              </div>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="px-8 py-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Score Breakdown
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-700 font-medium">Technical</span>
                  <span className={`font-bold ${getScoreColor(result.technicalScore).split(" ")[0]}`}>
                    {result.technicalScore}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${result.technicalScore}%` }}
                  />
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-700 font-medium">Communication</span>
                  <span className={`font-bold ${getScoreColor(result.communicationScore).split(" ")[0]}`}>
                    {result.communicationScore}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all"
                    style={{ width: `${result.communicationScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Role Readiness */}
          <div className="px-8 py-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Role Readiness
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-slate-200 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${result.roleReadinessPercent}%` }}
                  >
                    <span className="text-white text-xs font-bold">{result.roleReadinessPercent}%</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-slate-600 text-sm mt-2">
              {result.roleReadinessPercent >= 80
                ? "Excellent fit for the role!"
                : result.roleReadinessPercent >= 60
                ? "Good potential for the role with some development"
                : "Consider additional training and practice"}
            </p>
          </div>

          {/* Skills */}
          {Object.keys(result.skillScores).length > 0 && (
            <div className="px-8 py-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                Skill Assessment
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(result.skillScores).map(([skill, score]) => (
                  <div key={skill} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div className="text-sm font-medium text-slate-700 mb-1 capitalize">
                      {skill.replace(/_/g, " ")}
                    </div>
                    <div className={`text-2xl font-bold ${getScoreColor(score as number).split(" ")[0]}`}>
                      {score}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {result.topStrengths.length > 0 && (
            <div className="px-8 py-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-emerald-600" />
                Top Strengths
              </h2>
              <ul className="space-y-2">
                {result.topStrengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="text-slate-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {result.topWeaknesses.length > 0 && (
            <div className="px-8 py-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                Areas for Improvement
              </h2>
              <ul className="space-y-2">
                {result.topWeaknesses.map((weakness, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="text-slate-700">{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvement Plan */}
          {Object.keys(result.improvementPlan).length > 0 && (
            <div className="px-8 py-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">7-Day Improvement Plan</h2>
              <div className="space-y-4">
                {Object.entries(result.improvementPlan).map(([day, tasks]) => (
                  <div key={day} className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold text-slate-700 mb-2 capitalize">{day.replace(/-/g, " ")}</h3>
                    <ul className="space-y-1">
                      {(tasks as string[]).map((task, index) => (
                        <li key={index} className="text-slate-600 text-sm flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
