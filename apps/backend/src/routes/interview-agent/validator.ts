import { NotFoundError } from "../../core/ApiError";
import interviewAgentRepo from "../../database/repositories/interview-agent.repo";

export async function verifyInterviewAgent(interviewAgentId: number) {
    const interviewAgent = await interviewAgentRepo.checkById(interviewAgentId);
    if (!interviewAgent)
        throw new NotFoundError('Interview Agent does not exists.');
    
    return interviewAgent;
}

export async function verifyQuestionExists(quesionId: number) {
    const question = await interviewAgentRepo.checkQuestionById(quesionId);
    if (!question)
        throw new NotFoundError('Question Not found.');

    return question;
}