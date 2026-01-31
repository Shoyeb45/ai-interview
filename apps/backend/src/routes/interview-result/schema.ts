import userSchema from './../user/schema';
import interviewAgentSchema from './../interview-agent/schema';

const userInterviewParams = userSchema.userParams.extend(
    interviewAgentSchema.interviewAgentParam.shape,
);

export default {
    userInterviewParams
}