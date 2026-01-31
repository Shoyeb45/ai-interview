import {
    DifficultyLevel,
    ExperienceLevel,
    QuestionCategory,
    QuestionSelectionMode,
} from '@prisma/client';
import z from 'zod';

const questionCreate = z.object({
    questionText: z.string().min(1),
    category: z.enum(QuestionCategory),
    difficulty: z.enum(DifficultyLevel),
    orderIndex: z.coerce.number(),
    estimatedTime: z.coerce.number(),
    expectedKeywords: z.array(z.string()),
    focusAreas: z.array(z.string()),
});

const createInterviewAgent = z.object({
    title: z.string().min(1),
    role: z.string().min(1),
    jobDescription: z.string().min(1),
    experienceLevel: z.enum(ExperienceLevel),
    totalQuestions: z.coerce.number().min(1),
    estimatedDuration: z.coerce.number().min(10),
    focusAreas: z.array(z.string()).min(1),
    questionSelectionMode: z.enum(QuestionSelectionMode),
    maxCandidates: z.coerce.number(),
    maxAttemptsPerCandidate: z.coerce.number(),
    deadline: z.iso
        .datetime({ offset: true })
        .transform((val) => new Date(val)),
    questions: z.array(questionCreate),
});

const generateQuestion = createInterviewAgent.omit({
    maxAttemptsPerCandidate: true,
    maxCandidates: true,
    deadline: true,
});

const interviewAgentParam = z.object({
    interviewAgentId: z.coerce.number()
});

export type InterviewAgentSchema = {
    CreateInterviewAgent: z.infer<typeof createInterviewAgent>;
    GenerateQuestion: z.infer<typeof generateQuestion>;
    QuestionCreate: z.infer<typeof questionCreate>;
};

export default {
    createInterviewAgent,
    generateQuestion,
    questionCreate,
    interviewAgentParam
};
