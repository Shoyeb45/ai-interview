import { Redis } from 'ioredis';
import { redisConfig } from '../../config';
import logger from '../../core/logger';

class RedisClient {
    private static instance: RedisClient;
    private redis: Redis;
    private isConnected = false;

    private constructor() {
        this.redis = new Redis({
            host: redisConfig.redisHost,
            port: redisConfig.redisPort,
            password: redisConfig.redisPassword,
        });
        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        if (!this.redis) return;

        this.redis.on('connect', () => {
            this.isConnected = true;
            logger.info('Redis client connected');
        });

        this.redis.on('ready', () => {
            logger.info('Redis client ready');
        });

        this.redis.on('error', (error: Error) => {
            logger.error(
                'Redis client error',
                {
                    error: error.message,
                    stack: error.stack,
                },
            );
        });

        this.redis.on('close', () => {
            this.isConnected = false;
            logger.warn('Redis client connection closed');
        });

        this.redis.on('reconnecting', () => {
            logger.info('Redis client reconnecting...');
        });

        this.redis.on('end', () => {
            this.isConnected = false;
            logger.warn('Redis client connection ended');
        });
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new RedisClient();
        }
        return this.instance;
    }

    public isReady() {
        return this.isConnected && this.redis.status === 'ready';
    }

    // public async setForRun(runId: string, runStatus: RedisSubmission) {
    //     await this.redis.set(runId, JSON.stringify(runStatus), 'EX', 300);
    // }

    public async getResult(key: string) {
        return await this.redis.get(key);
    }

    public async setTestcase(problemId: string, value: string) {
        await this.redis.set(problemId, value, 'EX', 4 * 60 * 60);
    }

    // public async addTestcase(problmeId: string, testcase: TestcaseData[]) {
    //     const value = await this.getResult(problmeId);
    //     if (value === null) {
    //         logger.info('Testcases are not cached in redis.');
    //         return;
    //     }

    //     const data: TestcaseData[] = JSON.parse(value);
    //     data.push(...testcase);
    //     await this.setTestcase(problmeId, JSON.stringify(data));
    // }

    // public async deleteTestcase(problemId: string, testcaseId: string) {
    //     const value = await this.getResult(problemId);

    //     if (value === null) {
    //         // await this.redis.del(problemId);
    //         logger.info('Testcases are not cached in redis.');
    //         return;
    //     }

    //     const testcaseData: TestcaseData[] = JSON.parse(value);

    //     await this.setTestcase(
    //         problemId,
    //         JSON.stringify(testcaseData.filter(tc => tc.id !== testcaseId)),
    //     );
    // }

    /**
     * Redis Health check
     */
    public async healthCheck(): Promise<boolean> {
        try {
            if (!this.isReady()) {
                return false;
            }

            const result = await this.redis.ping();
            return result === 'PONG';
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Unknown error';
            logger.error(
                'Redis health check failed',
                {
                    error: message,
                },
            );
            return false;
        }
    }

    public async deleteKey(key: string) {
        await this.redis.del(key);
    }

    /**
     * Close Redis connection
     */
    public async close(): Promise<void> {
        try {
            await this.redis.quit();
            logger.info('Redis client connection closed gracefully');
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Unknown error';
            logger.error(
                'Error closing Redis connection',
                {
                    error: message,
                },
            );
            // Force close if graceful close fails
            this.redis.disconnect();
        }
    }
}

export const redisClient = RedisClient.getInstance();

