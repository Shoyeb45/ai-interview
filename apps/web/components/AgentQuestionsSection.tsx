"use client";

import { useState } from "react";
import { Sparkles, Plus, Pencil, Trash2 } from "lucide-react";
import type {
  InterviewQuestion,
  QuestionSelectionMode,
  QuestionCategory,
  DifficultyLevel,
} from "@/types/schema";
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  generateQuestionsByAI,
} from "@/lib/mockApi";
import { toast } from "sonner";

const QUESTION_SELECTION_OPTIONS: { value: QuestionSelectionMode; label: string }[] = [
  { value: "CUSTOM_ONLY", label: "Custom only – use only my questions" },
  { value: "AI_ONLY", label: "AI only – generate all questions from job details" },
  { value: "MIXED", label: "Mixed – custom questions first, AI fills the rest" },
];

const CATEGORY_OPTIONS: { value: QuestionCategory; label: string }[] = [
  { value: "TECHNICAL", label: "Technical" },
  { value: "BEHAVIORAL", label: "Behavioral" },
  { value: "CODING", label: "Coding" },
];

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string }[] = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

export type AgentFormDetails = {
  title: string;
  role: string;
  jobDescription: string;
  experienceLevel: string;
  focusAreas: string[];
  totalQuestions: number;
};

interface AgentQuestionsSectionProps {
  agentId: number | null;
  formDetails: AgentFormDetails;
  questionSelectionMode: QuestionSelectionMode;
  onQuestionSelectionModeChange: (mode: QuestionSelectionMode) => void;
  questions: InterviewQuestion[];
  onQuestionsChange: (questions: InterviewQuestion[]) => void;
}

function canGenerateQuestions(form: AgentFormDetails): boolean {
  return (
    (form.title?.trim() ?? "").length > 0 &&
    (form.role?.trim() ?? "").length > 0 &&
    (form.jobDescription?.trim() ?? "").length > 0 &&
    (form.experienceLevel?.trim() ?? "").length > 0 &&
    (form.focusAreas?.length ?? 0) > 0 &&
    (form.totalQuestions ?? 0) >= 1
  );
}

export default function AgentQuestionsSection({
  agentId,
  formDetails,
  questionSelectionMode,
  onQuestionSelectionModeChange,
  questions,
  onQuestionsChange,
}: AgentQuestionsSectionProps) {
  const [generating, setGenerating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftQuestion, setDraftQuestion] = useState<Partial<InterviewQuestion>>({
    questionText: "",
    category: "TECHNICAL",
    difficulty: "MEDIUM",
    orderIndex: 0,
    estimatedTime: 5,
    expectedKeywords: [],
    focusAreas: [],
  });

  const handleGenerateAI = async () => {
    if (!canGenerateQuestions(formDetails)) {
      toast.error("Fill in title, role, job description, experience level, at least one focus area, and total questions first.");
      return;
    }
    setGenerating(true);
    try {
      const payload = agentId
        ? { id: agentId, ...formDetails } as import("@/types/schema").InterviewAgent
        : formDetails;
      const generated = await generateQuestionsByAI(payload);
      const updated = [...questions, ...generated];
      onQuestionsChange(updated);
      toast.success(`Generated ${generated.length} question(s).`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate questions.";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const startAdd = () => {
    setEditingId(null);
    setDraftQuestion({
      questionText: "",
      category: "TECHNICAL",
      difficulty: "MEDIUM",
      orderIndex: questions.length + 1,
      estimatedTime: 5,
      expectedKeywords: [],
      focusAreas: [],
    });
    setAdding(true);
  };

  const saveNewQuestion = async () => {
    if (!draftQuestion.questionText?.trim()) {
      toast.error("Enter question text.");
      return;
    }
    if (agentId) {
      try {
        const created = await createQuestion(agentId, {
          questionText: draftQuestion.questionText.trim(),
          category: (draftQuestion.category as QuestionCategory) ?? "TECHNICAL",
          difficulty: (draftQuestion.difficulty as DifficultyLevel) ?? "MEDIUM",
          orderIndex: draftQuestion.orderIndex ?? questions.length + 1,
          estimatedTime: draftQuestion.estimatedTime ?? 5,
          expectedKeywords: draftQuestion.expectedKeywords ?? [],
          focusAreas: draftQuestion.focusAreas ?? [],
        });
        onQuestionsChange([...questions, created]);
        setAdding(false);
        setDraftQuestion({});
        toast.success("Question added.");
      } catch {
        toast.error("Failed to add question.");
      }
    } else {
      const temp: InterviewQuestion = {
        id: -(questions.length + 1),
        interviewAgentId: 0,
        questionText: draftQuestion.questionText.trim(),
        category: (draftQuestion.category as QuestionCategory) ?? "TECHNICAL",
        difficulty: (draftQuestion.difficulty as DifficultyLevel) ?? "MEDIUM",
        orderIndex: draftQuestion.orderIndex ?? questions.length + 1,
        estimatedTime: draftQuestion.estimatedTime ?? 5,
        isActive: true,
        expectedKeywords: draftQuestion.expectedKeywords ?? [],
        focusAreas: draftQuestion.focusAreas ?? [],
      };
      onQuestionsChange([...questions, temp]);
      setAdding(false);
      setDraftQuestion({});
      toast.success("Question added.");
    }
  };

  const startEdit = (q: InterviewQuestion) => {
    setAdding(false);
    setEditingId(q.id);
    setDraftQuestion({ ...q });
  };

  const saveEdit = async () => {
    if (editingId == null || !draftQuestion.questionText?.trim()) return;
    if (agentId) {
      try {
        const updated = await updateQuestion(agentId, editingId, {
          questionText: draftQuestion.questionText.trim(),
          category: draftQuestion.category as QuestionCategory,
          difficulty: draftQuestion.difficulty as DifficultyLevel,
          orderIndex: draftQuestion.orderIndex,
          estimatedTime: draftQuestion.estimatedTime,
          expectedKeywords: draftQuestion.expectedKeywords,
          focusAreas: draftQuestion.focusAreas,
        });
        onQuestionsChange(questions.map((q) => (q.id === editingId ? updated : q)));
        setEditingId(null);
        setDraftQuestion({});
        toast.success("Question updated.");
      } catch {
        toast.error("Failed to update question.");
      }
    } else {
      onQuestionsChange(
        questions.map((q) =>
          q.id === editingId
            ? {
                ...q,
                ...draftQuestion,
                questionText: draftQuestion.questionText!.trim(),
                category: (draftQuestion.category as QuestionCategory) ?? q.category,
                difficulty: (draftQuestion.difficulty as DifficultyLevel) ?? q.difficulty,
              }
            : q
        )
      );
      setEditingId(null);
      setDraftQuestion({});
      toast.success("Question updated.");
    }
  };

  const handleDelete = async (q: InterviewQuestion) => {
    if (!confirm("Remove this question?")) return;
    if (agentId && q.id > 0) {
      try {
        await deleteQuestion(agentId, q.id);
        onQuestionsChange(questions.filter((x) => x.id !== q.id));
        toast.success("Question removed.");
      } catch {
        toast.error("Failed to remove question.");
      }
    } else {
      onQuestionsChange(questions.filter((x) => x.id !== q.id));
      toast.success("Question removed.");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Question selection mode</label>
        <select
          value={questionSelectionMode}
          onChange={(e) => onQuestionSelectionModeChange(e.target.value as QuestionSelectionMode)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {QUESTION_SELECTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleGenerateAI}
          disabled={generating || !canGenerateQuestions(formDetails)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg font-medium hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="h-4 w-4" />
          {generating ? "Generating..." : "Generate questions using AI"}
        </button>
        {!canGenerateQuestions(formDetails) && (
          <span className="text-xs text-gray-500">
            Fill title, role, job description, experience level, focus areas, and total questions to enable.
          </span>
        )}
        <button
          type="button"
          onClick={startAdd}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" />
          Add question
        </button>
      </div>

      {(adding || editingId != null) && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <textarea
            value={draftQuestion.questionText ?? ""}
            onChange={(e) => setDraftQuestion((d) => ({ ...d, questionText: e.target.value }))}
            placeholder="Question text..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <select
                value={draftQuestion.category ?? "TECHNICAL"}
                onChange={(e) => setDraftQuestion((d) => ({ ...d, category: e.target.value as QuestionCategory }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Difficulty</label>
              <select
                value={draftQuestion.difficulty ?? "MEDIUM"}
                onChange={(e) => setDraftQuestion((d) => ({ ...d, difficulty: e.target.value as DifficultyLevel }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                {DIFFICULTY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Order</label>
              <input
                type="number"
                min={1}
                value={draftQuestion.orderIndex ?? 1}
                onChange={(e) => setDraftQuestion((d) => ({ ...d, orderIndex: parseInt(e.target.value, 10) || 1 }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Est. time (min)</label>
              <input
                type="number"
                min={1}
                value={draftQuestion.estimatedTime ?? 5}
                onChange={(e) => setDraftQuestion((d) => ({ ...d, estimatedTime: parseInt(e.target.value, 10) || 5 }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={editingId != null ? saveEdit : saveNewQuestion}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              {editingId != null ? "Save" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setEditingId(null); setDraftQuestion({}); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">Questions ({questions.length})</h3>
        {questions.length === 0 ? (
          <p className="text-sm text-gray-500">No questions yet. Add manually or generate using AI.</p>
        ) : (
          <ul className="space-y-2">
            {questions
              .slice()
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((q) => (
                <li
                  key={q.id}
                  className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3"
                >
                  <span className="text-gray-400 font-mono text-sm mt-0.5">#{q.orderIndex}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-sm">{q.questionText}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {q.category} · {q.difficulty} · ~{q.estimatedTime} min
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(q)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(q)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
