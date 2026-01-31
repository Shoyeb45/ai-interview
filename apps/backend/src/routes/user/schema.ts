import z from 'zod';

const sessionParams = z.object({
    sessionId: z.coerce.number(),
});

const userParams = z.object({
    userId: z.coerce.number(),
});

export default {
    sessionParams,
    userParams,
};
