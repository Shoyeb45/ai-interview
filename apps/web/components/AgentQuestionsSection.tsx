"use client";

import { useState, useMemo } from "react";
import { Sparkles, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  InterviewQuestion,
  QuestionSelectionMode,
  QuestionCategory,
  DifficultyLevel,
  InterviewAgentStatus,
  ExperienceLevel,
} from "@/types/schema";
import { generateQuestionsByAI } from "@/lib/mockApi";
import { toast } from "sonner";

const QUESTION_SELECTION_OPTIONS: { value: QuestionSelectionMode; label: string }[] = [
  { value: "CUSTOM_ONLY", label: "Custom only – use only my questions" },
  { value: "AI_ONLY", label: "AI only – generate all questions from job details" },
  { value: "MIXED", label: "Mixed – custom questions first, AI fills the rest" },
];

/**
 * 
 *   TECHNICAL       // coding, algorithms, system design
  BEHAVIORAL      // past experience, situational
  PROBLEM_SOLVING // case studies, brain teasers
  DOMAIN_KNOWLEDGE // role-specific knowledge (e.g. ML, databases)
  CULTURAL_FIT    // values, working style
  CODING  
 */
const CATEGORY_OPTIONS: { value: QuestionCategory; label: string }[] = [
  { value: "TECHNICAL", label: "Technical" },
  { value: "BEHAVIORAL", label: "Behavioral" },
  { value: "CODING", label: "Coding" },
  { value: 'PROBLEM_SOLVING', label: "Problem Solving"},
  { value: 'DOMAIN_KNOWLEDGE', label: 'Domain Knowledge'},
  { value: 'CULTURAL_FIT', label: 'Cultural Fit'},

];

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string }[] = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

export type AgentFormDetails = {
    title: string,
    role: string,
    jobDescription: string,
    experienceLevel: ExperienceLevel,
    questionSelectionMode: QuestionSelectionMode,
    totalQuestions: number,
    estimatedDuration: number,
    focusAreas: string[],
    maxCandidates: number,
    maxAttemptsPerCandidate: number,
    deadline: string,
    status: InterviewAgentStatus,
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

function SortableQuestionRow({
  question,
  index,
  onEdit,
  onDelete,
}: {
  question: InterviewQuestion;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(question.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3 ${isDragging ? "opacity-60 shadow-lg z-10" : ""}`}
    >
      <button
        type="button"
        className="touch-none p-1 -ml-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="text-gray-400 font-mono text-sm mt-0.5 shrink-0">#{index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-gray-900 text-sm">{question.questionText}</p>
        <p className="text-xs text-gray-500 mt-1">
          {question.category} · {question.difficulty} · ~{question.estimatedTime} min
        </p>
      </div>
      <div className="flex gap-1 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
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
    estimatedTime: 5,
    expectedKeywords: [],
    focusAreas: [],
  });

  const questionIds = useMemo(() => questions.map((q) => String(q.id)), [questions]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over == null || active.id === over.id) return;
    const oldIndex = questions.findIndex((q) => String(q.id) === active.id);
    const newIndex = questions.findIndex((q) => String(q.id) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(questions, oldIndex, newIndex);
    onQuestionsChange(reordered);
  };

  const handleGenerateAI = async () => {
    if (!canGenerateQuestions(formDetails)) {
      toast.error("Fill in title, role, job description, experience level, at least one focus area, and total questions first.");
      return;
    }
    setGenerating(true);
    try {
      const generated = await generateQuestionsByAI(formDetails);
      // Normalize to InterviewQuestion: add temp negative id and interviewAgentId for list keys and submit
      const nextTempId = Math.min(0, ...questions.map((q) => q.id), 0) - 1;
      const normalized: InterviewQuestion[] = generated.map((q, i) => ({
        id: nextTempId - i,
        interviewAgentId: agentId ?? 0,
        questionText: q.questionText,
        category: q.category as QuestionCategory,
        difficulty: q.difficulty as DifficultyLevel,
        orderIndex: questions.length + i + 1, // display order is array position; edit page sends index+1
        estimatedTime: q.estimatedTime ?? 5,
        isActive: true,
        expectedKeywords: q.expectedKeywords ?? [],
        focusAreas: q.focusAreas ?? [],
      }));
      const updated = [...questions, ...normalized];
      onQuestionsChange(updated);
      toast.success(`Generated ${normalized.length} question(s).`);
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
      estimatedTime: 5,
      expectedKeywords: [],
      focusAreas: [],
    });
    setAdding(true);
  };

  const saveNewQuestion = () => {
    if (!draftQuestion.questionText?.trim()) {
      toast.error("Enter question text.");
      return;
    }
    const temp: InterviewQuestion = {
      id: -(questions.length + 1),
      interviewAgentId: agentId ?? 0,
      questionText: draftQuestion.questionText.trim(),
      category: (draftQuestion.category as QuestionCategory) ?? "TECHNICAL",
      difficulty: (draftQuestion.difficulty as DifficultyLevel) ?? "MEDIUM",
      orderIndex: questions.length + 1, // order is by list position
      estimatedTime: draftQuestion.estimatedTime ?? 5,
      isActive: true,
      expectedKeywords: draftQuestion.expectedKeywords ?? [],
      focusAreas: draftQuestion.focusAreas ?? [],
    };
    onQuestionsChange([...questions, temp]);
    setAdding(false);
    setDraftQuestion({});
    toast.success("Question added.");
  };

  const startEdit = (q: InterviewQuestion) => {
    setAdding(false);
    setEditingId(q.id);
    setDraftQuestion({ ...q });
  };

  const saveEdit = () => {
    if (editingId == null || !draftQuestion.questionText?.trim()) return;
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
  };

  const handleDelete = (q: InterviewQuestion) => {
    if (!confirm("Remove this question?")) return;
    onQuestionsChange(questions.filter((x) => x.id !== q.id));
    toast.success("Question removed.");
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
          <p className="text-xs text-gray-500">Drag the handle to reorder questions. Order is saved when you click Save changes.</p>
        )}
        {questions.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={questionIds} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {questions.map((q, idx) => (
                  <SortableQuestionRow
                    key={q.id}
                    question={q}
                    index={idx}
                    onEdit={() => startEdit(q)}
                    onDelete={() => handleDelete(q)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
