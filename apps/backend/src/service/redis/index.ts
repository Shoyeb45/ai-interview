import logger from "../../core/logger";
import interviewAgentRepo from "../../database/repositories/interview-agent.repo";
import { redisClient } from "./client";

async function getAndStoreSessionDetails(interviewAgentId: number, userId: number, sessionId: number, interviewId: number) {
    logger.info('storing interview agent details in the redis.');
    const interviewAgent = await interviewAgentRepo.getInterviewAgentWithQuestionsById(interviewAgentId);
    await redisClient.setSession('session-' + sessionId, JSON.stringify({
        ...interviewAgent,
        userId,
        sessionId,
        interviewId
    }));
    logger.info('Stored interview agent successfully.');
}

export default {
    getAndStoreSessionDetails
};