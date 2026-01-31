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

    // 20 minutes
    public async setSession(sessionId: string, value: string) {
        await this.redis.set(sessionId, value, 'EX', 20 * 60);
    }

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

