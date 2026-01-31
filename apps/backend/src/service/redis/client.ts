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
            logger.error('Redis client error', {
                error: error.message,
                stack: error.stack,
            });
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
            logger.error('Redis health check failed', {
                error: message,
            });
            return false;
        }
    }

    public async deleteKey(key: string) {
        await this.redis.del(key);
    }

    /**
     * Create consumer group if it doesn't exist
     */
    public async createConsumerGroup(
        streamKey: string,
        groupName: string,
        startId: string = '0',
    ): Promise<void> {
        try {
            await this.redis.xgroup(
                'CREATE',
                streamKey,
                groupName,
                startId,
                'MKSTREAM',
            );
            logger.info(
                `Consumer group "${groupName}" created for stream "${streamKey}"`,
            );
        } catch (error) {
            // BUSYGROUP error means group already exists, which is fine
            if (error instanceof Error && error.message.includes('BUSYGROUP')) {
                logger.info(`Consumer group "${groupName}" already exists`);
            } else {
                throw error;
            }
        }
    }

    /**
     * Read messages from stream using consumer group
     */
    public async readFromGroup(
        streamKey: string,
        groupName: string,
        consumerName: string,
        count: number = 10,
        blockMs: number = 5000,
    ) {
        try {
            const results = await this.redis.xreadgroup(
                'GROUP',
                groupName,
                consumerName,
                'COUNT',
                count,
                'BLOCK',
                blockMs,
                'STREAMS',
                streamKey,
                '>', // Read new messages not yet delivered to this consumer group
            );

            return results;
        } catch (error) {
            logger.error('Error reading from consumer group', {
                error: error instanceof Error ? error.message : 'Unknown error',
                streamKey,
                groupName,
                consumerName,
            });
            throw error;
        }
    }

    /**
     * Acknowledge message processing
     */
    public async acknowledgeMessage(
        streamKey: string,
        groupName: string,
        messageId: string,
    ): Promise<void> {
        await this.redis.xack(streamKey, groupName, messageId);
    }

    /**
     * Get pending messages for this consumer
     */
    public async getPendingMessages(
        streamKey: string,
        groupName: string,
        consumerName: string,
        count: number = 10,
    ) {
        try {
            // Get pending message IDs
            const pending = await this.redis.xpending(
                streamKey,
                groupName,
                '-',
                '+',
                count,
                consumerName,
            );

            if (!pending || pending.length === 0) {
                return null;
            }

            // Claim these messages
            const messageIds = pending.map((p: never) => p[0]);
            const results = await this.redis.xclaim(
                streamKey,
                groupName,
                consumerName,
                60000, // Min idle time in ms (1 minute)
                ...messageIds,
            );

            return results;
        } catch (error) {
            logger.error('Error getting pending messages', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
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
            logger.error('Error closing Redis connection', {
                error: message,
            });
            // Force close if graceful close fails
            this.redis.disconnect();
        }
    }

    /**
     * Get underlying Redis client for advanced operations
     */
    public getClient(): Redis {
        return this.redis;
    }
}

export const redisClient = RedisClient.getInstance();
