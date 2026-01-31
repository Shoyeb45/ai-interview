from src.services.redis.client import RedisClient

redis_client = RedisClient.get_instance()

__all__ = ["RedisClient", "redis_client"]
