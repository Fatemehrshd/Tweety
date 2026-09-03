import { NextResponse } from "next/server";
import { getDataSource } from "@/db";
import { redis } from "@/modules/shared/redis";

export async function GET() {
  const checks: { db: string; redis: string } = { db: "down", redis: "down" };

  try {
    const ds = await getDataSource();
    if (ds.isInitialized) {
      await ds.query("SELECT 1");
      checks.db = "up";
    }
  } catch {
    // leave db: down
  }

  try {
    await redis.ping();
    checks.redis = "up";
  } catch {
    // leave redis: down
  }

  const healthy = checks.db === "up" && checks.redis === "up";
  return NextResponse.json({ status: healthy ? "healthy" : "degraded", checks }, { status: healthy ? 200 : 503 });
}
