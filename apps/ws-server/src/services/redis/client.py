import redis
import logging
from typing import Optional
import os 

logger = logging.getLogger(__name__)


class RedisClient:
    _instance: Optional["RedisClient"] = None

    def __init__(self):
        self.redis = redis.Redis(
            host=os.getenv('REDIS_HOST'),          # redisConfig.redisHost
            port=os.getenv('REDIS_PORT'),                 # redisConfig.redisPort
            password=os.getenv('REDIS_PASSWORD'),             # redisConfig.redisPassword
            decode_responses=True,     # return strings (like ioredis)
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
        )
        self._is_connected = False
        self._connect()

    def _connect(self):
        try:
            self.redis.ping()
            self._is_connected = True
            logger.info("Redis client connected and ready")
        except redis.RedisError as e:
            self._is_connected = False
            logger.error("Redis connection failed", exc_info=e)

    @classmethod
    def get_instance(cls) -> "RedisClient":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def is_ready(self) -> bool:
        return self._is_connected

    # -------------------------
    # Redis operations
    # -------------------------

    def get(self, key: str) -> Optional[str]:
        return self.redis.get(key)

    def set(self, key: str, value: str, ttl_seconds: int):
        self.redis.setex(key, ttl_seconds, value)

    def set_session(self, session_id: str, value: str):
        # 20 hours
        self.set(session_id, value, 20 * 60)

    def delete(self, key: str):
        self.redis.delete(key)

    # -------------------------
    # Stream operations (for event publishing)
    # -------------------------

    def xadd_event(self, stream_key: str, event_type: str, payload: dict, max_len: Optional[int] = 10000) -> Optional[str]:
        """
        Add event with type and payload to Redis stream.
        Returns message ID or None on error.
        payload: dict (will be JSON-serialized)
        """
        import json
        import time
        try:
            fields = {
                "event": event_type,
                "payload": json.dumps(payload, default=str),
                "ts": str(time.time()),
            }
            kwargs = {}
            if max_len:
                kwargs["maxlen"] = max_len
                kwargs["approximate"] = True
            msg_id = self.redis.xadd(stream_key, fields, **kwargs)
            return msg_id
        except redis.RedisError as e:
            logger.error("Redis XADD event failed", exc_info=e)
            return None


    def health_check(self) -> bool:
        try:
            return self.redis.ping() is True
        except redis.RedisError as e:
            logger.error("Redis health check failed", exc_info=e)
            return False

    # -------------------------
    # Shutdown
    # -------------------------

    def close(self):
        try:
            self.redis.close()
            logger.info("Redis connection closed gracefully")
        except redis.RedisError as e:
            logger.error("Error closing Redis connection", exc_info=e)
