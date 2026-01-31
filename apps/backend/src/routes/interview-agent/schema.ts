import { ExperienceLevel } from "@prisma/client";
import z from "zod";

const createInterviewAgent = z.object({
    title: z.string().min(1),
    role: z.string().min(1),
    jobDescription: z.string().min(1),
    experienceLevel: z.enum(ExperienceLevel),
    totalQuestions: z.coerce.number().min(1),
    estimatedDuration: z.coerce.number().min(10),
    focusAreas: z.array(z.string()).min(1),
    maxCandidates: z.coerce.number(),
    maxAttemptsPerCandidate: z.coerce.number(),
    deadline: z.iso.datetime({ offset: true }).transform(val => new Date(val)),
});

export type InterviewAgentSchema = {
    CreateInterviewAgent: z.infer<typeof createInterviewAgent>;
}

export default {
    createInterviewAgent
};
