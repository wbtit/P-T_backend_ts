// src/config/redisClient.ts
import { createClient, RedisClientType } from "redis";

// Create Redis client with type annotation
const redis: RedisClientType = createClient({
  url: "redis://127.0.0.1:6379",
});

// Handle errors
redis.on("error", (err: Error) => {
  console.error("❌ Redis Client Error:", err);
});

// Connect to Redis
(async () => {
  try {
    await redis.connect();
    console.log("✅ Redis connected successfully");
  } catch (err) {
    console.error("🚨 Failed to connect to Redis:", err);
  }
})();

export default redis;
