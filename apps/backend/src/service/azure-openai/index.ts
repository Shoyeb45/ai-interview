import { DifficultyLevel, QuestionCategory } from "@prisma/client";
import { InterviewAgentSchema } from "../../routes/interview-agent/schema";
import { azureOpenAI } from "./client";
import { azureOpenAICred } from "../../config";
import { BadRequestError } from "../../core/ApiError";

interface GeneratedInterviewQuestionsResponse {
  questions: InterviewAgentSchema['QuestionCreate'][];
}

// Experience level to difficulty distribution mapping
const DIFFICULTY_DISTRIBUTION: Record<string, { EASY: number; MEDIUM: number; HARD: number }> = {
  INTERN: { EASY: 70, MEDIUM: 25, HARD: 5 },
  ENTRY_LEVEL: { EASY: 60, MEDIUM: 35, HARD: 5 },
  JUNIOR: { EASY: 40, MEDIUM: 50, HARD: 10 },
  MID_LEVEL: { EASY: 20, MEDIUM: 60, HARD: 20 },
  SENIOR: { EASY: 10, MEDIUM: 50, HARD: 40 },
  LEAD: { EASY: 5, MEDIUM: 40, HARD: 55 },
  PRINCIPAL: { EASY: 0, MEDIUM: 30, HARD: 70 },
};

/**
 * Generate interview questions using Azure OpenAI
 * Includes validation, error handling, and retry logic
 */
export async function getInterviewQuestions(
  data: InterviewAgentSchema['GenerateQuestion'],
  maxRetries: number = 2
): Promise<GeneratedInterviewQuestionsResponse> {
  
  let lastError: Error | null = null;

  // Retry loop
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await azureOpenAI.chat.completions.create({
        model: azureOpenAICred.deployment,
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(),
          },
          {
            role: 'user',
            content: buildUserPrompt(data),
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 4000, // Ensure enough tokens for all questions
      });

      const content = response.choices[0].message.content;

      if (!content) {
        throw new BadRequestError("Empty response from Azure OpenAI");
      }

      // Parse and validate JSON
      let parsed: GeneratedInterviewQuestionsResponse;
      try {
        parsed = JSON.parse(content);
      } catch (_parseError) {
        throw new BadRequestError(
          `Failed to parse JSON response from OpenAI. Raw response: ${content.substring(0, 200)}...`
        );
      }

      // Validate the structure
      validateResponse(parsed, data.totalQuestions);

      // Normalize and return
      return normalizeResponse(parsed, data);

    } catch (error) {
      lastError = error as Error;
      
      // If it's a validation error and we have retries left, try again
      if (attempt < maxRetries) {
        console.warn(`Attempt ${attempt + 1} failed, retrying...`, error);
        continue;
      }
      
      // All retries exhausted
      break;
    }
  }

  // If we get here, all attempts failed
  throw new BadRequestError(
    `Failed to generate interview questions after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`
  );
}

/**
 * Build the system prompt with strict JSON schema requirements
 */
function buildSystemPrompt(): string {
  return `You are an expert technical interviewer and question generator.

Your task is to generate high-quality interview questions based on the job requirements provided.

CRITICAL: You must respond with ONLY a valid JSON object. No markdown, no explanations, no code blocks.

The JSON must follow this EXACT schema:

{
  "questions": [
    {
      "questionText": "string (the actual question)",
      "category": "TECHNICAL | BEHAVIORAL | PROBLEM_SOLVING | DOMAIN_KNOWLEDGE | CULTURAL_FIT | CODING",
      "difficulty": "EASY | MEDIUM | HARD",
      "orderIndex": number (1, 2, 3...),
      "estimatedTime": number (minutes to answer, typically 3-10),
      "expectedKeywords": ["keyword1", "keyword2", "keyword3"],
      "focusAreas": ["area1", "area2"]
    }
  ]
}

Rules:
1. Generate exactly the number of questions requested
2. Distribute difficulty levels appropriately for the experience level
3. Include diverse question categories (technical, behavioral, problem-solving, etc.)
4. Each question should be clear, specific, and relevant to the role
5. Expected keywords should be technical terms the candidate should mention
6. Focus areas should map to the provided focus areas where relevant
7. Estimated time should be realistic (3-10 minutes per question)
8. Order index must start at 1 and increment by 1`;
}

/**
 * Build the user prompt with structured data
 */
function buildUserPrompt(data: InterviewAgentSchema['GenerateQuestion']): string {
  const difficultyDistribution = DIFFICULTY_DISTRIBUTION[data.experienceLevel];
  
  return `Generate ${data.totalQuestions} interview questions for the following position:

Position: ${data.title}
Role: ${data.role}
Experience Level: ${data.experienceLevel}
Total Duration: ${data.estimatedDuration} minutes
Focus Areas: ${data.focusAreas.join(', ')}

Job Description:
${data.jobDescription}

Question Requirements:
1. Total Questions: ${data.totalQuestions}
2. Difficulty Distribution (approximate):
   - EASY: ${difficultyDistribution.EASY}%
   - MEDIUM: ${difficultyDistribution.MEDIUM}%
   - HARD: ${difficultyDistribution.HARD}%
3. Categories: Mix of TECHNICAL, BEHAVIORAL, PROBLEM_SOLVING, DOMAIN_KNOWLEDGE
4. Focus heavily on: ${data.focusAreas.join(', ')}
5. Total estimated time should be around ${data.estimatedDuration} minutes

Generate questions that are:
- Specific to the role and experience level
- Practical and relevant to real-world scenarios
- Clear and unambiguous
- Appropriate difficulty for ${data.experienceLevel} level

Return ONLY the JSON object, no other text.`;
}

/**
 * Validate the parsed response structure and content
 */
function validateResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response: any,
  expectedQuestionCount: number
): asserts response is GeneratedInterviewQuestionsResponse {
  
  // Check if response has questions array
  if (!response || typeof response !== 'object') {
    throw new BadRequestError("Response is not a valid object");
  }

  if (!Array.isArray(response.questions)) {
    throw new BadRequestError("Response missing 'questions' array");
  }

  // Check question count
  if (response.questions.length !== expectedQuestionCount) {
    throw new BadRequestError(
      `Expected ${expectedQuestionCount} questions, got ${response.questions.length}`
    );
  }

  // Validate each question
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response.questions.forEach((question: any, index: number) => {
    const questionNum = index + 1;

    // Required fields
    if (!question.questionText || typeof question.questionText !== 'string') {
      throw new BadRequestError(`Question ${questionNum}: Missing or invalid 'questionText'`);
    }

    if (!question.category || typeof question.category !== 'string') {
      throw new BadRequestError(`Question ${questionNum}: Missing or invalid 'category'`);
    }

    if (!question.difficulty || typeof question.difficulty !== 'string') {
      throw new BadRequestError(`Question ${questionNum}: Missing or invalid 'difficulty'`);
    }

    if (typeof question.orderIndex !== 'number') {
      throw new BadRequestError(`Question ${questionNum}: Missing or invalid 'orderIndex'`);
    }

    if (typeof question.estimatedTime !== 'number') {
      throw new BadRequestError(`Question ${questionNum}: Missing or invalid 'estimatedTime'`);
    }

    // Validate enum values
    const validCategories: QuestionCategory[] = [
      'TECHNICAL',
      'BEHAVIORAL',
      'PROBLEM_SOLVING',
      'DOMAIN_KNOWLEDGE',
      'CULTURAL_FIT',
      'CODING',
    ];
    if (!validCategories.includes(question.category as QuestionCategory)) {
      throw new BadRequestError(
        `Question ${questionNum}: Invalid category '${question.category}'. Must be one of: ${validCategories.join(', ')}`
      );
    }

    const validDifficulties: DifficultyLevel[] = ['EASY', 'MEDIUM', 'HARD'];
    if (!validDifficulties.includes(question.difficulty as DifficultyLevel)) {
      throw new BadRequestError(
        `Question ${questionNum}: Invalid difficulty '${question.difficulty}'. Must be one of: ${validDifficulties.join(', ')}`
      );
    }

    // Validate arrays (optional but should be arrays if present)
    if (question.expectedKeywords !== undefined && !Array.isArray(question.expectedKeywords)) {
      throw new BadRequestError(`Question ${questionNum}: 'expectedKeywords' must be an array`);
    }

    if (question.focusAreas !== undefined && !Array.isArray(question.focusAreas)) {
      throw new BadRequestError(`Question ${questionNum}: 'focusAreas' must be an array`);
    }

    // Validate reasonable values
    if (question.estimatedTime < 1 || question.estimatedTime > 30) {
      throw new BadRequestError(
        `Question ${questionNum}: 'estimatedTime' must be between 1 and 30 minutes`
      );
    }

    if (question.questionText.length < 10) {
      throw new BadRequestError(
        `Question ${questionNum}: 'questionText' is too short (minimum 10 characters)`
      );
    }
  });

  // Validate orderIndex sequence
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderIndices = response.questions.map((q: any) => q.orderIndex).sort((a: number, b: number) => a - b);
  const expectedIndices = Array.from({ length: expectedQuestionCount }, (_, i) => i + 1);
  
  if (JSON.stringify(orderIndices) !== JSON.stringify(expectedIndices)) {
    throw new BadRequestError(
      `Invalid orderIndex sequence. Expected [${expectedIndices.join(', ')}], got [${orderIndices.join(', ')}]`
    );
  }
}

/**
 * Normalize the response to ensure all optional fields are present
 */
function normalizeResponse(
  response: GeneratedInterviewQuestionsResponse,
  inputData: InterviewAgentSchema['GenerateQuestion']
): GeneratedInterviewQuestionsResponse {
  
  return {
    questions: response.questions.map((question) => ({
      questionText: question.questionText.trim(),
      category: question.category,
      difficulty: question.difficulty,
      orderIndex: question.orderIndex,
      estimatedTime: question.estimatedTime,
      expectedKeywords: question.expectedKeywords || [],
      focusAreas: question.focusAreas || inputData.focusAreas, // Default to input focus areas
    })),
  };
}

/**
 * Helper function to calculate difficulty distribution for a given count
 */
export function calculateDifficultyDistribution(
  totalQuestions: number,
  experienceLevel: string
): { EASY: number; MEDIUM: number; HARD: number } {
  
  const distribution = DIFFICULTY_DISTRIBUTION[experienceLevel] || DIFFICULTY_DISTRIBUTION.MID_LEVEL;
  
  const easyCount = Math.round((totalQuestions * distribution.EASY) / 100);
  const hardCount = Math.round((totalQuestions * distribution.HARD) / 100);
  const mediumCount = totalQuestions - easyCount - hardCount;

  return {
    EASY: easyCount,
    MEDIUM: mediumCount,
    HARD: hardCount,
  };
}

