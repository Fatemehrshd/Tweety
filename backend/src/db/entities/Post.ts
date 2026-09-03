import { randomUUID } from "crypto";
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
  Check,
} from "typeorm";
import type { User } from "./User";

@Entity({ name: "posts" })
@Index("idx_posts_created_at", ["createdAt"])
@Index("idx_posts_author_id", ["authorId"])
@Check(`"text" <> '' AND length("text") <= 280`)
export class Post {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ type: "uuid", name: "author_id" })
  authorId!: string;

  // String target breaks the Post <-> User runtime import cycle
  // (emitDecoratorMetadata would otherwise evaluate the class at import time).
  @ManyToOne("User", "posts", { onDelete: "CASCADE" })
  @JoinColumn({ name: "author_id" })
  author!: User;

  @Column({ type: "text" })
  text!: string;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;

  @BeforeInsert()
  ensureId() {
    if (!this.id) this.id = randomUUID();
  }
}
