import logger from './core/logger.js';
import express from 'express';
import cors from 'cors';
import { originUrl } from './config.js';
import router from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { NotFoundError } from './core/ApiError.js';
import cookieParser from 'cookie-parser';
import helmet from "helmet";

process.on('uncaughtException', (e) => {
    logger.error(e);
});

export const app = express();

// Adjust the size of response body as per requirement
app.use(express.json({ limit: '10mb' }));
app.use(
    express.urlencoded({
        limit: '10mb',
        extended: true,
        parameterLimit: 50000,
    }),
);
// Allows cross origin reference
app.use(
    cors({
        origin: originUrl,
        optionsSuccessStatus: 200,
        credentials: true,
    }),
);
app.use(cookieParser());
// Adds security header, express best security practice
app.use(helmet());

// Main routes
app.use('/', router);

app.use((_req, _res, next) => next(new NotFoundError()));
app.use(errorHandler);
