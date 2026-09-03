import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1733270400000 implements MigrationInterface {
  name = "InitialSchema1733270400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL,
        "email" character varying(255) NOT NULL,
        "username" character varying(64) NOT NULL,
        "password_hash" text NOT NULL,
        "bio" text,
        "profile_picture_url" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_users_email" ON "users" ("email")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_users_username" ON "users" ("username")
    `);

    await queryRunner.query(`
      CREATE TABLE "posts" (
        "id" uuid NOT NULL,
        "author_id" uuid NOT NULL,
        "text" text NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_posts_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_posts_text" CHECK ("text" <> '' AND length("text") <= 280)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_posts_created_at" ON "posts" ("created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_posts_author_id" ON "posts" ("author_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "posts"
        ADD CONSTRAINT "FK_posts_author_id"
        FOREIGN KEY ("author_id") REFERENCES "users"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "FK_posts_author_id"`);
    await queryRunner.query(`DROP INDEX "idx_posts_author_id"`);
    await queryRunner.query(`DROP INDEX "idx_posts_created_at"`);
    await queryRunner.query(`DROP TABLE "posts"`);
    await queryRunner.query(`DROP INDEX "uq_users_username"`);
    await queryRunner.query(`DROP INDEX "uq_users_email"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
