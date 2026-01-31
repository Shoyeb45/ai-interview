import { prisma } from '..';
import {
    QuestionCategory,
    QuestionSource,
    DifficultyLevel,
} from '@prisma/client';

interface CreateConversationInput {
    interviewId: number;
    questionNumber: number;
    question: string;
    category?: QuestionCategory;
    difficulty?: DifficultyLevel;
    questionSource?: QuestionSource;
    interviewQuestionId?: number;
    answer?: string;
    questionAskedAt: Date;
    answerStartedAt?: Date;
    answerEndedAt?: Date;
    thinkingTime?: number;
    answerDuration?: number;
    strugglingIndicators?: number;
    confidenceScore?: number;
    clarificationsAsked?: number;
    hintsProvided?: number;
}

const createConversation = async (data: CreateConversationInput) => {
    return await prisma.conversation.create({
        data: {
            interviewId: data.interviewId,
            questionNumber: data.questionNumber,
            question: data.question,
            category: data.category ?? null,
            difficulty: data.difficulty ?? null,
            questionSource: data.questionSource ?? 'AI_GENERATED',
            interviewQuestionId: data.interviewQuestionId ?? null,
            answer: data.answer ?? null,
            questionAskedAt: data.questionAskedAt,
            answerStartedAt: data.answerStartedAt ?? null,
            answerEndedAt: data.answerEndedAt ?? null,
            thinkingTime: data.thinkingTime ?? null,
            answerDuration: data.answerDuration ?? null,
            strugglingIndicators: data.strugglingIndicators ?? 0,
            confidenceScore: data.confidenceScore ?? null,
            clarificationsAsked: data.clarificationsAsked ?? 0,
            hintsProvided: data.hintsProvided ?? 0,
        },
    });
};

const createMessages = async (
    conversationId: number,
    messages: { role: 'USER' | 'ASSISTANT' | 'SYSTEM'; content: string; timestamp?: Date }[]
) => {
    return await prisma.message.createMany({
        data: messages.map((m) => ({
            conversationId,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp ?? new Date(),
        })),
    });
};

export default {
    createConversation,
    createMessages,
};
