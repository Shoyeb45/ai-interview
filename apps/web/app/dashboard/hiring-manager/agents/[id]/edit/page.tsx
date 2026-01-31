"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import apiClient from "@/lib/apiClient";
import type { ExperienceLevel, InterviewAgentStatus, QuestionSelectionMode, InterviewQuestion } from "@/types/schema";
import AgentQuestionsSection from "@/components/AgentQuestionsSection";
import { toast } from "sonner";

/** GET /interview-agent/:interviewAgentId response (data key) */
export interface InterviewAgentEditGet {
  title: string;
  role: string;
  jobDescription: string;
  openingMessage?: string | null;
  experienceLevel: ExperienceLevel;
  totalQuestions: number;
  estimatedDuration: number;
  focusAreas: string[];
  maxCandidates: number;
  maxAttemptsPerCandidate: number;
  deadline: string | null;
  questions: {
    questionText: string;
    category: string;
    difficulty: string;
    orderIndex: number;
    estimatedTime: number;
    id: number;
  }[];
  id: number;
  status: InterviewAgentStatus;
  questionSelectionMode?: QuestionSelectionMode;
}

/** PATCH /interview-agent/:interviewAgentId body. New questions use questionId undefined. */
export interface InterviewAgentPatchBody {
  questions?: {
    questionId?: number;
    questionText?: string;
    category?: "TECHNICAL" | "BEHAVIORAL" | "PROBLEM_SOLVING" | "DOMAIN_KNOWLEDGE" | "CULTURAL_FIT" | "CODING";
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    orderIndex?: number;
    estimatedTime?: number;
    expectedKeywords?: string[];
    focusAreas?: string[];
  }[];
  title?: string;
  role?: string;
  status: InterviewAgentStatus;
  jobDescription?: string;
  experienceLevel?: ExperienceLevel;
  totalQuestions?: number;
  estimatedDuration?: number;
  focusAreas?: string[];
  questionSelectionMode?: QuestionSelectionMode;
  maxCandidates?: number;
  maxAttemptsPerCandidate?: number;
  deadline?: string | null;
  openingMessage?: string | null;
}

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "INTERN", label: "Intern" },
  { value: "ENTRY_LEVEL", label: "Entry Level" },
  { value: "JUNIOR", label: "Junior (1-2 years)" },
  { value: "MID_LEVEL", label: "Mid Level (3-5 years)" },
  { value: "SENIOR", label: "Senior (5+ years)" },
  { value: "LEAD", label: "Lead" },
  { value: "PRINCIPAL", label: "Principal" },
];

const FOCUS_OPTIONS = [
  "algorithms",
  "system design",
  "databases",
  "web development",
  "apis",
  "security",
  "testing",
  "behavioral",
];

export default function EditAgentPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    role: "",
    jobDescription: "",
    openingMessage: "",
    experienceLevel: "MID_LEVEL" as ExperienceLevel,
    questionSelectionMode: "MIXED" as QuestionSelectionMode,
    totalQuestions: 6,
    estimatedDuration: 30,
    focusAreas: [] as string[],
    maxCandidates: 100,
    maxAttemptsPerCandidate: 3,
    deadline: "",
    status: "DRAFT" as InterviewAgentStatus,
  });
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);

  const load = useCallback(async () => {
    if (!id || isNaN(id)) return;
    setLoading(true);
    try {
      const data = await apiClient.get<InterviewAgentEditGet>(`/interview-agent/detailed/${id}`);
      if (data) {
        setForm({
          title: data.title,
          role: data.role,
          jobDescription: data.jobDescription,
          openingMessage: data.openingMessage ?? "",
          experienceLevel: data.experienceLevel as ExperienceLevel,
          questionSelectionMode: (data.questionSelectionMode ?? "MIXED") as QuestionSelectionMode,
          totalQuestions: data.totalQuestions,
          estimatedDuration: data.estimatedDuration,
          focusAreas: data.focusAreas ?? [],
          maxCandidates: data.maxCandidates,
          maxAttemptsPerCandidate: data.maxAttemptsPerCandidate,
          deadline: data.deadline ? new Date(data.deadline).toISOString().slice(0, 16) : "",
          status: data.status,
        });
        const mappedQuestions: InterviewQuestion[] = (data.questions ?? [])
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((q) => ({
            id: q.id,
            interviewAgentId: id,
            questionText: q.questionText,
            category: q.category as InterviewQuestion["category"],
            difficulty: q.difficulty as InterviewQuestion["difficulty"],
            orderIndex: q.orderIndex,
            estimatedTime: q.estimatedTime,
            isActive: true,
            expectedKeywords: [],
            focusAreas: [],
          }));
        setQuestions(mappedQuestions);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load agent";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFocus = (area: string) => {
    setForm((f) => ({
      ...f,
      focusAreas: f.focusAreas.includes(area)
        ? f.focusAreas.filter((a) => a !== area)
        : [...f.focusAreas, area],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: InterviewAgentPatchBody = {
        title: form.title,
        role: form.role,
        jobDescription: form.jobDescription,
        openingMessage: form.openingMessage,
        experienceLevel: form.experienceLevel,
        questionSelectionMode: form.questionSelectionMode,
        totalQuestions: form.totalQuestions,
        estimatedDuration: form.estimatedDuration,
        focusAreas: form.focusAreas,
        maxCandidates: form.maxCandidates,
        maxAttemptsPerCandidate: form.maxAttemptsPerCandidate,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        status: form.status,
        questions: questions.map((q, index) => ({
          questionId: q.id > 0 ? q.id : undefined,
          questionText: q.questionText,
          category: q.category,
          difficulty: q.difficulty,
          orderIndex: index + 1,
          estimatedTime: q.estimatedTime,
          expectedKeywords: q.expectedKeywords?.length ? q.expectedKeywords : undefined,
          focusAreas: q.focusAreas?.length ? q.focusAreas : undefined,
        })),
      };
      await apiClient.patch<unknown, InterviewAgentPatchBody>(`/interview-agent/${id}`, body);
      toast.success("Interview agent updated");
      // router.push(`/dashboard/hiring-manager/agents/${id}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update agent";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href={`/dashboard/hiring-manager/agents/${id}`}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to agent
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Interview Agent</h1>
        <p className="text-gray-600 mt-1">Update role, questions, and limits</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Backend Developer Interview"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
          <input
            type="text"
            required
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            placeholder="e.g. Software Engineer"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job description *</label>
          <textarea
            required
            rows={5}
            value={form.jobDescription}
            onChange={(e) => setForm((f) => ({ ...f, jobDescription: e.target.value }))}
            placeholder="Paste or describe the job requirements..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Opening message (optional)</label>
          <textarea
            rows={3}
            value={form.openingMessage}
            onChange={(e) => setForm((f) => ({ ...f, openingMessage: e.target.value }))}
            placeholder="Message shown to the candidate at the start of the interview..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Experience level</label>
          <select
            value={form.experienceLevel}
            onChange={(e) => setForm((f) => ({ ...f, experienceLevel: e.target.value as ExperienceLevel }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {EXPERIENCE_LEVELS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total questions</label>
            <input
              type="number"
              min={1}
              max={20}
              value={form.totalQuestions}
              onChange={(e) => setForm((f) => ({ ...f, totalQuestions: parseInt(e.target.value, 10) || 6 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estimated duration (min)</label>
            <input
              type="number"
              min={5}
              value={form.estimatedDuration}
              onChange={(e) => setForm((f) => ({ ...f, estimatedDuration: parseInt(e.target.value, 10) || 30 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Focus areas</label>
          <div className="flex flex-wrap gap-2">
            {FOCUS_OPTIONS.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => toggleFocus(area)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  form.focusAreas.includes(area)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Questions</h2>
          <AgentQuestionsSection
            agentId={id}
            formDetails={form}
            questionSelectionMode={form.questionSelectionMode}
            onQuestionSelectionModeChange={(mode) => setForm((f) => ({ ...f, questionSelectionMode: mode }))}
            questions={questions}
            onQuestionsChange={setQuestions}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max candidates</label>
            <input
              type="number"
              min={1}
              value={form.maxCandidates}
              onChange={(e) => setForm((f) => ({ ...f, maxCandidates: parseInt(e.target.value, 10) || 100 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max attempts per candidate</label>
            <input
              type="number"
              min={1}
              value={form.maxAttemptsPerCandidate}
              onChange={(e) => setForm((f) => ({ ...f, maxAttemptsPerCandidate: parseInt(e.target.value, 10) || 3 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deadline (optional)</label>
          <input
            type="datetime-local"
            value={form.deadline}
            onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as InterviewAgentStatus }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="PAUSED">Paused</option>
            <option value="CLOSED">Closed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          <Link
            href={`/dashboard/hiring-manager/agents/${id}`}
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
