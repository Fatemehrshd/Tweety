import "reflect-metadata";
import * as dotenv from "dotenv";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { Post } from "./entities/Post";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST ?? "localhost",
  port: parseInt(process.env.DB_PORT ?? "5432", 10),
  username: process.env.DB_USER ?? "postgres",
  password: process.env.DB_PASSWORD ?? "postgres",
  database: process.env.DB_NAME ?? "final_project",
  entities: [User, Post],
  migrations: [__dirname + "/../migrations/*.{ts,js}"],
  migrationsRun: false,
  synchronize: false,
  logging: process.env.NODE_ENV === "development" ? ["error", "warn"] : false,
});

let initPromise: Promise<DataSource> | null = null;

/** Lazy, idempotent init — safe to call from many concurrent requests. */
export function getDataSource(): Promise<DataSource> {
  if (AppDataSource.isInitialized) return Promise.resolve(AppDataSource);
  if (!initPromise) {
    initPromise = AppDataSource.initialize();
  }
  return initPromise;
}
