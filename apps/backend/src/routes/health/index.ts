import { SuccessMsgResponse } from '../../core/ApiResponse';
import { Router } from 'express';

const router = Router();

router.get('/', async (_req, res) => {
    new SuccessMsgResponse('The server is healthy and running.').send(res);
});

export default router;
