import { HiringDecision } from '@prisma/client';
import { azureOpenAI } from '../azure-openai/client';
import { azureOpenAICred } from '../../config';
import logger from '../../core/logger';

interface ReportAnalysis {
    overallScore: number;
    technicalScore: number;
    communicationScore: number;
    problemSolvingScore: number;
    cultureFitScore: number;
    skillScores: Record<string, number>;
    topStrengths: string[];
    topWeaknesses: string[];
    decision: HiringDecision;
    roleReadinessPercent: number;
    improvementPlan: Record<string, string[]>;
    detailedFeedback: string;
    transcriptSummary: string;
}

export async function generateInterviewReport(
    conversationHistory: Array<{ role: string; content: string }>,
    jobDescription: string,
    role: string,
    totalQuestions: number,
    questionsAnswered: number,
    avgResponseTime: number,
    avgConfidence: number,
    totalHintsUsed: number,
    interviewDurationMinutes: number,
    proctoringMetrics?: { avgEngagement: number; facePresentRatio: number }
): Promise<ReportAnalysis> {
    const systemPrompt = `You are an expert interview evaluator. Generate a comprehensive interview report.

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "overallScore": number (0-100),
  "technicalScore": number (0-100),
  "communicationScore": number (0-100),
  "problemSolvingScore": number (0-100),
  "cultureFitScore": number (0-100),
  "skillScores": {"skillName": number 0-100},
  "topStrengths": ["string"],
  "topWeaknesses": ["string"],
  "decision": "STRONG_HIRE" | "HIRE" | "BORDERLINE" | "NO_HIRE" | "STRONG_NO_HIRE",
  "roleReadinessPercent": number (0-100),
  "improvementPlan": {"day1-2": ["string"], "day3-4": ["string"], "day5-6": ["string"], "day7": ["string"]},
  "detailedFeedback": "string (comprehensive 2-4 paragraph feedback)",
  "transcriptSummary": "string (brief summary of the interview)"
}`;

    const transcript = conversationHistory
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n\n');

    const userPrompt = `Role: ${role}

Job Description:
${jobDescription.substring(0, 2000)}

Interview Transcript:
${transcript}

Metrics:
- Total questions: ${totalQuestions}
- Questions answered: ${questionsAnswered}
- Avg response time: ${avgResponseTime}s
- Avg confidence: ${avgConfidence}
- Total hints used: ${totalHintsUsed}
- Interview duration: ${interviewDurationMinutes} min
${proctoringMetrics ? `- Proctoring: avg engagement ${(proctoringMetrics.avgEngagement * 100).toFixed(0)}%, face visible ${(proctoringMetrics.facePresentRatio * 100).toFixed(0)}% of snapshots (factor into culture fit / professionalism)` : ''}

Generate the comprehensive report JSON.`;

    try {
        const response = await azureOpenAI.chat.completions.create({
            model: azureOpenAICred.deployment,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.4,
            max_tokens: 2000,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('Empty AI response');

        const parsed = JSON.parse(content) as ReportAnalysis;
        const validDecisions: HiringDecision[] = [
            'STRONG_HIRE',
            'HIRE',
            'BORDERLINE',
            'NO_HIRE',
            'STRONG_NO_HIRE',
        ];

        const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

        return {
            overallScore: clamp100(parsed.overallScore ?? 50),
            technicalScore: clamp100(parsed.technicalScore ?? 50),
            communicationScore: clamp100(parsed.communicationScore ?? 50),
            problemSolvingScore: clamp100(parsed.problemSolvingScore ?? 50),
            cultureFitScore: clamp100(parsed.cultureFitScore ?? 50),
            skillScores: typeof parsed.skillScores === 'object' ? parsed.skillScores : {},
            topStrengths: Array.isArray(parsed.topStrengths) ? parsed.topStrengths : ['Attended interview'],
            topWeaknesses: Array.isArray(parsed.topWeaknesses) ? parsed.topWeaknesses : ['Needs more practice'],
            decision: validDecisions.includes(parsed.decision) ? parsed.decision : 'BORDERLINE',
            roleReadinessPercent: clamp100(parsed.roleReadinessPercent ?? 50),
            improvementPlan: typeof parsed.improvementPlan === 'object' ? parsed.improvementPlan : {
                'day1-2': ['Review fundamentals'],
                'day3-4': ['Practice mock interviews'],
                'day5-6': ['Deep dive on weak areas'],
                'day7': ['Final practice'],
            },
            detailedFeedback: typeof parsed.detailedFeedback === 'string' ? parsed.detailedFeedback : 'Feedback generated.',
            transcriptSummary: typeof parsed.transcriptSummary === 'string' ? parsed.transcriptSummary : 'Interview completed.',
        };
    } catch (error) {
        logger.error('Generate report failed', { error });
        return {
            overallScore: 50,
            technicalScore: 50,
            communicationScore: 50,
            problemSolvingScore: 50,
            cultureFitScore: 50,
            skillScores: {},
            topStrengths: ['Completed interview'],
            topWeaknesses: ['Report generation failed'],
            decision: 'BORDERLINE',
            roleReadinessPercent: 50,
            improvementPlan: {
                'day1-2': ['Review interview performance'],
                'day3-4': ['Practice similar questions'],
                'day5-6': ['Strengthen weak areas'],
                'day7': ['Take another practice interview'],
            },
            detailedFeedback: 'Report generation encountered an error. Please review your responses.',
            transcriptSummary: 'Interview completed.',
        };
    }
}
