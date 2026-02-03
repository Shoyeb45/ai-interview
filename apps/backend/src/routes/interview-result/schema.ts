import z from 'zod';
import userSchema from './../user/schema';
import interviewAgentSchema from './../interview-agent/schema';

const userInterviewParams = userSchema.userParams.extend(
    interviewAgentSchema.interviewAgentParam.shape,
);

const sessionResultParams = z.object({
    sessionId: z.coerce.number(),
});

export default {
    userInterviewParams,
    sessionResultParams,
}