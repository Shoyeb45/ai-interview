import { azureOpenAI } from '../azure-openai/client';
import { azureOpenAICred } from '../../config';
import logger from '../../core/logger';

interface QuestionFeedbackAnalysis {
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

export async function analyzeQuestionFeedback(
    question: string,
    userResponse: string,
    aiResponse: string,
    conversationHistory: Array<{ role: string; content: string }>,
    jobDescription: string,
    role: string,
    metrics?: { strugglingIndicators?: number; confidenceScore?: boolean }
): Promise<QuestionFeedbackAnalysis> {
    const systemPrompt = `You are an expert interview evaluator. Analyze the candidate's answer and provide structured feedback.

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "answerQuality": number (1-10),
  "technicalAccuracy": number (1-10),
  "communicationClarity": number (1-10),
  "problemSolvingSkill": number (1-10),
  "strengths": ["string"],
  "weaknesses": ["string"],
  "suggestions": ["string"],
  "expectedKeywords": ["string"],
  "mentionedKeywords": ["string"],
  "missedKeywords": ["string"],
  "feedback": "string (2-3 sentence narrative feedback)"
}

Guidelines:
- Be fair and constructive
- expectedKeywords: key concepts the answer should have covered
- mentionedKeywords: concepts the candidate did mention
- missedKeywords: important concepts they missed
- Consider struggling indicators and confidence in scoring`;

    const conversationContext = conversationHistory
        .slice(-10)
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

    const userPrompt = `Role: ${role}

Job Description:
${jobDescription.substring(0, 1500)}

Question asked: ${question}

Candidate's answer: ${userResponse}

Interviewer's response: ${aiResponse}

Recent conversation context:
${conversationContext}

${metrics?.strugglingIndicators ? `Note: Candidate showed ${metrics.strugglingIndicators} struggling indicators.` : ''}

Analyze and return the JSON feedback.`;

    try {
        const response = await azureOpenAI.chat.completions.create({
            model: azureOpenAICred.deployment,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 800,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('Empty AI response');

        const parsed = JSON.parse(content) as QuestionFeedbackAnalysis;

        // Validate and clamp scores
        const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n)));
        return {
            answerQuality: clamp(parsed.answerQuality ?? 5),
            technicalAccuracy: clamp(parsed.technicalAccuracy ?? 5),
            communicationClarity: clamp(parsed.communicationClarity ?? 5),
            problemSolvingSkill: clamp(parsed.problemSolvingSkill ?? 5),
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Completed the question'],
            weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : ['Good effort overall'],
            suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : ['Keep practicing'],
            expectedKeywords: Array.isArray(parsed.expectedKeywords) ? parsed.expectedKeywords : [],
            mentionedKeywords: Array.isArray(parsed.mentionedKeywords) ? parsed.mentionedKeywords : [],
            missedKeywords: Array.isArray(parsed.missedKeywords) ? parsed.missedKeywords : [],
            feedback: typeof parsed.feedback === 'string' ? parsed.feedback : 'Feedback generated.',
        };
    } catch (error) {
        logger.error('Question feedback analysis failed', { error });
        // Return default fallback
        return {
            answerQuality: 5,
            technicalAccuracy: 5,
            communicationClarity: 5,
            problemSolvingSkill: 5,
            strengths: ['Completed the question'],
            weaknesses: ['Unable to analyze in detail'],
            suggestions: ['Keep practicing similar questions'],
            expectedKeywords: [],
            mentionedKeywords: [],
            missedKeywords: [],
            feedback: 'Analysis unavailable. Consider reviewing your answer.',
        };
    }
}
