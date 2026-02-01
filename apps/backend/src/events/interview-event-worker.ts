import logger from '../core/logger';
import { redisClient } from '../service/redis/client';
import interviewSessionRepo from '../database/repositories/interview-session.repo';
import conversationRepo from '../database/repositories/conversation.repo';
import feedbackRepo from '../database/repositories/feedback.repo';
import interviewResultRepo from '../database/repositories/interview-result.repo';
import { prisma } from '../database/index';
import { analyzeQuestionFeedback } from '../service/feedback/analyze-question';
import { generateInterviewReport } from '../service/feedback/generate-report';
import { QuestionCategory, QuestionSource, DifficultyLevel } from '@prisma/client';

const STREAM_KEY = 'interview_events';
const GROUP_NAME = 'interview_processors';

interface ParsedEvent {
    event: string;
    payload: string;
    ts?: string;
}

interface StartInterviewPayload {
    sessionId: number;
    interviewId?: number;
    userId?: number;
    interviewAgentId?: number;
}

interface EndInterviewPayload extends StartInterviewPayload {
    conversationHistory?: Array<{ role: string; content: string }>;
}

interface AbandonInterviewPayload extends EndInterviewPayload {
    reason: string;
}

interface QuestionEvaluatePayload extends StartInterviewPayload {
    questionNumber: number;
    question: string;
    userResponse: string;
    aiResponse: string;
    questionAskedAt?: string;
    answerStartedAt?: string;
    answerEndedAt?: string;
    thinkingTime?: number;
    answerDuration?: number;
    conversationHistory: Array<{ role: string; content: string }>;
    metrics?: Record<string, unknown>;
    interviewQuestionId?: number;
    category?: string;
    difficulty?: string;
}

interface GenerateReportPayload extends EndInterviewPayload {
    conversationHistory: Array<{ role: string; content: string }>;
}

function parseFields(fields: string[]): Record<string, string> {
    const obj: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
        if (fields[i] !== undefined && fields[i + 1] !== undefined) {
            obj[fields[i]] = fields[i + 1];
        }
    }
    return obj;
}

function parseEvent(fields: string[]): ParsedEvent | null {
    const obj = parseFields(fields);
    const event = obj.event;
    const payload = obj.payload;
    if (!event || !payload) return null;
    return { event, payload, ts: obj.ts };
}

async function handleStartInterview(p: StartInterviewPayload): Promise<void> {
    const sessionId = Number(p.sessionId);
    if (!sessionId || isNaN(sessionId)) {
        logger.warn('Invalid sessionId for start_interview', p);
        return;
    }
    await interviewSessionRepo.startInterview(sessionId);
    logger.info('Interview started', { sessionId });
}

async function handleEndInterview(p: EndInterviewPayload): Promise<void> {
    const sessionId = Number(p.sessionId);
    if (!sessionId || isNaN(sessionId)) return;
    await interviewSessionRepo.endInterview(sessionId);
    logger.info('Interview ended', { sessionId });
}

async function handleAbandonInterview(p: AbandonInterviewPayload): Promise<void> {
    const sessionId = Number(p.sessionId);
    if (!sessionId || isNaN(sessionId)) return;
    await interviewSessionRepo.abandonInterview(sessionId, p.reason);
    logger.info('Interview abandoned', { sessionId, reason: p.reason });
}

async function handleQuestionEvaluate(p: QuestionEvaluatePayload): Promise<void> {
    const sessionId = Number(p.sessionId);
    const interviewId = Number(p.interviewId);

    if (!sessionId || isNaN(sessionId) || !interviewId || isNaN(interviewId)) {
        logger.warn('Invalid sessionId or interviewId for question_evaluate', p);
        return;
    }

    const session = await prisma.candidateInterviewSession.findUnique({
        where: { id: sessionId },
        include: { interviewAgent: true },
    });
    const jobDescription = session?.interviewAgent?.jobDescription ?? '';
    const role = session?.interviewAgent?.role ?? 'Software Engineer';

    const questionAskedAt = p.questionAskedAt
        ? new Date(p.questionAskedAt)
        : new Date();
    const answerEndedAt = p.answerEndedAt ? new Date(p.answerEndedAt) : new Date();

    const rawConfidence = p.metrics?.confidence_score;
    const confidenceScore = typeof rawConfidence === 'number' && rawConfidence >= 0 && rawConfidence <= 1
        ? rawConfidence
        : typeof rawConfidence === 'boolean'
            ? (rawConfidence ? 0.8 : 0.4)
            : 0.5;

    const conversation = await conversationRepo.createConversation({
        interviewId,
        questionNumber: p.questionNumber,
        question: p.question,
        category: (p.category as QuestionCategory) ?? undefined,
        difficulty: (p.difficulty as DifficultyLevel) ?? undefined,
        questionSource: p.interviewQuestionId ? ('CUSTOM' as QuestionSource) : ('AI_GENERATED' as QuestionSource),
        interviewQuestionId: p.interviewQuestionId ?? undefined,
        answer: p.userResponse,
        questionAskedAt,
        answerEndedAt,
        answerDuration: p.answerDuration ?? undefined,
        strugglingIndicators: (p.metrics?.struggling_indicators as number) ?? 0,
        confidenceScore,
    });

    const messages = (p.conversationHistory ?? []).map((m) => ({
        role: (m.role === 'user' ? 'USER' : m.role === 'assistant' ? 'ASSISTANT' : 'SYSTEM') as 'USER' | 'ASSISTANT' | 'SYSTEM',
        content: m.content,
    }));
    await conversationRepo.createMessages(conversation.id, messages);

    try {
        const analysis = await analyzeQuestionFeedback(
            p.question,
            p.userResponse,
            p.aiResponse,
            p.conversationHistory ?? [],
            jobDescription,
            role,
            {
                strugglingIndicators: (p.metrics?.struggling_indicators as number) ?? 0,
                confidenceScore: (p.metrics?.confidence_score as boolean) ?? false,
            }
        );

        await feedbackRepo.createQuestionFeedback({
            conversationId: conversation.id,
            answerQuality: analysis.answerQuality,
            technicalAccuracy: analysis.technicalAccuracy,
            communicationClarity: analysis.communicationClarity,
            problemSolvingSkill: analysis.problemSolvingSkill,
            strengths: analysis.strengths,
            weaknesses: analysis.weaknesses,
            suggestions: analysis.suggestions,
            expectedKeywords: analysis.expectedKeywords,
            mentionedKeywords: analysis.mentionedKeywords,
            missedKeywords: analysis.missedKeywords,
            feedback: analysis.feedback,
        });

        const overallScore = Math.round(
            (analysis.answerQuality +
                analysis.technicalAccuracy +
                analysis.communicationClarity +
                analysis.problemSolvingSkill) /
                4 *
                10
        );

        await feedbackRepo.createQuestionResult({
            sessionId,
            conversationId: conversation.id,
            questionNumber: p.questionNumber,
            overallQuestionScore: overallScore,
            technicalScore: analysis.technicalAccuracy * 10,
            communicationScore: analysis.communicationClarity * 10,
            problemSolvingScore: analysis.problemSolvingSkill * 10,
            confidenceScore,
        });
    } catch (err) {
        logger.error('Question evaluate failed', { error: err, sessionId });
    }

    logger.info('Question evaluated', { sessionId, questionNumber: p.questionNumber });
}

async function handleGenerateReport(p: GenerateReportPayload): Promise<void> {
    const sessionId = Number(p.sessionId);
    const interviewId = Number(p.interviewId);
    const userId = Number(p.userId);

    if (!sessionId || !interviewId || !userId) {
        logger.warn('Missing ids for generate_report', p);
        return;
    }

    const session = await prisma.candidateInterviewSession.findUnique({
        where: { id: sessionId },
        include: {
            interviewAgent: true,
            questionResults: true,
        },
    });
    const jobDescription = session?.interviewAgent?.jobDescription ?? '';
    const role = session?.interviewAgent?.role ?? 'Software Engineer';
    const totalQuestions = session?.interviewAgent?.totalQuestions ?? 6;

    const history = p.conversationHistory ?? [];
    const questionsAnswered = history.filter((m) => m.role === 'user').length;

    const startedAt = session?.startedAt ? new Date(session.startedAt) : new Date();
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();
    const interviewDurationMinutes = Math.round(durationMs / 60000) || 1;

    const avgConfidence =
        session?.questionResults?.length
            ? session.questionResults.reduce((a, r) => a + r.confidenceScore, 0) /
              session.questionResults.length
            : 0.7;

    const report = await generateInterviewReport(
        history,
        jobDescription,
        role,
        totalQuestions,
        questionsAnswered,
        30,
        avgConfidence,
        0,
        interviewDurationMinutes
    );

    await interviewResultRepo.createInterviewResult({
        interviewId,
        sessionId,
        userId,
        overallScore: report.overallScore,
        technicalScore: report.technicalScore,
        communicationScore: report.communicationScore,
        problemSolvingScore: report.problemSolvingScore,
        cultureFitScore: report.cultureFitScore,
        skillScores: report.skillScores,
        topStrengths: report.topStrengths,
        topWeaknesses: report.topWeaknesses,
        decision: report.decision,
        roleReadinessPercent: report.roleReadinessPercent,
        improvementPlan: report.improvementPlan,
        detailedFeedback: report.detailedFeedback,
        transcriptSummary: report.transcriptSummary,
        totalQuestions,
        questionsAnswered,
        avgResponseTime: 30,
        avgConfidence,
        totalHintsUsed: 0,
        interviewDuration: interviewDurationMinutes,
    });

    logger.info('Report generated', { sessionId, interviewId });
}

async function handleInterviewEvent(parsed: ParsedEvent): Promise<void> {
    let payload: unknown;
    try {
        payload = JSON.parse(parsed.payload) as Record<string, unknown>;
    } catch {
        logger.warn('Invalid payload JSON', { event: parsed.event });
        return;
    }

    const p = payload as Record<string, unknown>;
    switch (parsed.event) {
        case 'start_interview':
            await handleStartInterview(p as unknown as StartInterviewPayload);
            break;
        case 'end_interview':
            await handleEndInterview(p as unknown as EndInterviewPayload);
            break;
        case 'abandon_interview':
            await handleAbandonInterview(p as unknown as AbandonInterviewPayload);
            break;
        case 'question_evaluate':
            await handleQuestionEvaluate(p as unknown as QuestionEvaluatePayload);
            break;
        case 'generate_report':
            await handleGenerateReport(p as unknown as GenerateReportPayload);
            break;
        default:
            logger.warn('Unknown event type', { event: parsed.event });
    }
}

class InterviewStreamConsumer {
    private consumerName: string;
    private isRunning = false;

    constructor(consumerName: string = `consumer_${process.pid}`) {
        this.consumerName = consumerName;
    }

    public async initialize(): Promise<void> {
        try {
            await redisClient.createConsumerGroup(STREAM_KEY, GROUP_NAME, '0');
            logger.info(`Consumer "${this.consumerName}" initialized`);
        } catch (err) {
            logger.warn('Consumer group init (may already exist)', { error: err });
        }
    }

    private async processMessage(messageId: string, fields: string[]): Promise<void> {
        const parsed = parseEvent(fields);
        if (!parsed) {
            logger.warn('Could not parse event', { messageId });
            await redisClient.acknowledgeMessage(STREAM_KEY, GROUP_NAME, messageId);
            return;
        }

        try {
            await handleInterviewEvent(parsed);
            await redisClient.acknowledgeMessage(STREAM_KEY, GROUP_NAME, messageId);
            logger.info('Message processed', { messageId, event: parsed.event });
        } catch (error) {
            logger.error('Error processing message', {
                messageId,
                event: parsed.event,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }

    public async start(): Promise<void> {
        this.isRunning = true;
        logger.info(`Starting consumer "${this.consumerName}"`);
        await this.initialize();

        while (this.isRunning) {
            try {
                const pending = await redisClient.getPendingMessages(
                    STREAM_KEY,
                    GROUP_NAME,
                    this.consumerName,
                    10
                );
                if (pending && Array.isArray(pending)) {
                    for (const msg of pending) {
                        const [msgId, fields] = msg as [string, string[]];
                        const fieldArr = Array.isArray(fields) ? fields : [];
                        await this.processMessage(String(msgId), fieldArr);
                    }
                }

                const results = await redisClient.readFromGroup(
                    STREAM_KEY,
                    GROUP_NAME,
                    this.consumerName,
                    10,
                    5000
                );

                if (results && results.length > 0) {
                    const [, messages] = results[0] as [string, [string, string[]][]];
                    if (messages && Array.isArray(messages)) {
                        for (const msg of messages) {
                            const [msgId, fields] = msg;
                            const fieldArr = Array.isArray(fields) ? fields : [];
                            await this.processMessage(msgId, fieldArr);
                        }
                    }
                }
            } catch (error) {
                logger.error('Consumer loop error', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                await new Promise((r) => setTimeout(r, 1000));
            }
        }
        logger.info(`Consumer "${this.consumerName}" stopped`);
    }

    public stop(): void {
        this.isRunning = false;
    }
}

const consumer = new InterviewStreamConsumer();

async function startConsumer() {
    try {
        await consumer.start();
    } catch (error) {
        logger.error('Consumer error', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        process.exit(1);
    }
}

process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down...');
    consumer.stop();
    await redisClient.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down...');
    consumer.stop();
    await redisClient.close();
    process.exit(0);
});

export { InterviewStreamConsumer, startConsumer };

// Run when executed directly
const isMain = require.main === module;
if (isMain) {
    startConsumer().catch(console.error);
}
