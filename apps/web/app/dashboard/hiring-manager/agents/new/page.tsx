"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createInterviewAgent } from "@/lib/mockApi";
import type { ExperienceLevel, InterviewAgentStatus } from "@/types/schema";
import type { InterviewQuestion, QuestionSelectionMode } from "@/types/schema";
import AgentQuestionsSection, { AgentFormDetails } from "@/components/AgentQuestionsSection";
import { toast } from "sonner";

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

export default function NewAgentPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    role: "",
    jobDescription: "",
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
      const agent = await createInterviewAgent({
        title: form.title,
        role: form.role,
        jobDescription: form.jobDescription,
        experienceLevel: form.experienceLevel,
        questionSelectionMode: form.questionSelectionMode,
        totalQuestions: form.totalQuestions,
        estimatedDuration: form.estimatedDuration,
        focusAreas: form.focusAreas,
        maxCandidates: form.maxCandidates,
        maxAttemptsPerCandidate: form.maxAttemptsPerCandidate,
        deadline: form.deadline || null,
        status: form.status,
        questions,
      });
      toast.success("Interview agent created");
      router.push(`/dashboard/hiring-manager/agents/${agent.id}`);
    } catch {
      toast.error("Failed to create agent");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/dashboard/hiring-manager/agents"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to agents
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Interview Agent</h1>
        <p className="text-gray-600 mt-1">Define role, questions, and limits</p>
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
            agentId={null}
            formDetails={form as AgentFormDetails}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
          <input
            type="datetime-local"
            value={form.deadline ? form.deadline.slice(0, 16) : ""}
            onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value ? new Date(e.target.value).toISOString() : "" }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create agent"}
          </button>
          <Link
            href="/dashboard/hiring-manager/agents"
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
