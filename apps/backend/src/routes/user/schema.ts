import z from "zod";

const sessionParams = z.object({
    sessionId: z.coerce.number()
});

export default {
    sessionParams
};