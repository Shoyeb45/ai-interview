import { prisma } from '..';

interface CreateQuestionFeedbackInput {
    conversationId: number;
    answerQuality: number;
    technicalAccuracy: number;
    communicationClarity: number;
    problemSolvingSkill: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    expectedKeywords: string[];
    mentionedKeywords: string[];
    missedKeywords: string[];
    feedback: string;
}

interface CreateQuestionResultInput {
    sessionId: number;
    conversationId: number;
    questionNumber: number;
    overallQuestionScore: number;
    technicalScore: number;
    communicationScore: number;
    problemSolvingScore: number;
    confidenceScore: number;
    difficultyWeight?: number;
    hintUsed?: boolean;
    skipped?: boolean;
}

const createQuestionFeedback = async (data: CreateQuestionFeedbackInput) => {
    return await prisma.questionFeedback.create({
        data: {
            conversationId: data.conversationId,
            answerQuality: data.answerQuality,
            technicalAccuracy: data.technicalAccuracy,
            communicationClarity: data.communicationClarity,
            problemSolvingSkill: data.problemSolvingSkill,
            strengths: data.strengths,
            weaknesses: data.weaknesses,
            suggestions: data.suggestions,
            expectedKeywords: data.expectedKeywords,
            mentionedKeywords: data.mentionedKeywords,
            missedKeywords: data.missedKeywords,
            feedback: data.feedback,
        },
    });
};

const createQuestionResult = async (data: CreateQuestionResultInput) => {
    return await prisma.candidateQuestionResult.create({
        data: {
            sessionId: data.sessionId,
            conversationId: data.conversationId,
            questionNumber: data.questionNumber,
            overallQuestionScore: data.overallQuestionScore,
            technicalScore: data.technicalScore,
            communicationScore: data.communicationScore,
            problemSolvingScore: data.problemSolvingScore,
            confidenceScore: data.confidenceScore,
            difficultyWeight: data.difficultyWeight ?? 1.0,
            hintUsed: data.hintUsed ?? false,
            skipped: data.skipped ?? false,
        },
    });
};

export default {
    createQuestionFeedback,
    createQuestionResult,
};
