import Redis from "ioredis";

const url = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis = new Redis(url, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on("error", (err) => {
  // Avoid throwing — caller code (withErrorHandling) decides what to do.
  // eslint-disable-next-line no-console
  console.error("[redis] error:", err.message);
});

export const REFRESH_KEY_PREFIX = "refresh:";
export const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function storeRefreshToken(token: string, userId: string): Promise<void> {
  await redis.set(REFRESH_KEY_PREFIX + token, userId, "EX", REFRESH_TTL_SECONDS);
}

export async function getRefreshTokenUserId(token: string): Promise<string | null> {
  return redis.get(REFRESH_KEY_PREFIX + token);
}

export async function deleteRefreshToken(token: string): Promise<void> {
  await redis.del(REFRESH_KEY_PREFIX + token);
}

export async function rotateRefreshToken(oldToken: string, newToken: string, userId: string): Promise<void> {
  // Atomic rotation: delete old, write new. Best-effort; race window is acceptable for MVP.
  const pipeline = redis.multi();
  pipeline.del(REFRESH_KEY_PREFIX + oldToken);
  pipeline.set(REFRESH_KEY_PREFIX + newToken, userId, "EX", REFRESH_TTL_SECONDS);
  await pipeline.exec();
}
