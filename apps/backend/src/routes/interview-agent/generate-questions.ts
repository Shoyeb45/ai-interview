import { Router } from 'express';
import { asyncHandler } from '../../core/asyncHandler';
import { ProtectedRequest } from '../../types/app-requests';
import { validator } from '../../middlewares/validator.middleware';
import schema, { InterviewAgentSchema } from './schema';
import { ValidationSource } from '../../helpers/validator';
import { authorize } from '../../middlewares/authorize.middleware';
import { RoleCode } from '@prisma/client';
import { getInterviewQuestions } from '../../service/azure-openai';
import { SuccessResponse } from '../../core/ApiResponse';

const router = Router();

router.use(authorize(RoleCode.HIRING_MANAGER));

router.post(
    '/',
    validator(schema.generateQuestion, ValidationSource.BODY),
    asyncHandler<ProtectedRequest>(async (req, res) => {
        const data = req.body as InterviewAgentSchema['GenerateQuestion'];
        const questions = await getInterviewQuestions(data);

        new SuccessResponse('Generated questions successfully.', questions.questions).send(res);
    }),
);


export default router;