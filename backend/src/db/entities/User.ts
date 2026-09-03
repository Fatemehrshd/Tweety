import { randomUUID } from "crypto";
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  OneToMany,
  Index,
} from "typeorm";
import { Post } from "./Post";

@Entity({ name: "users" })
export class User {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  // Case-insensitive uniqueness is enforced in the service layer
  // (always lowercase before save / query) so we avoid the citext extension.
  @Index("uq_users_email", { unique: true })
  @Column({ type: "varchar", length: 255 })
  email!: string;

  @Index("uq_users_username", { unique: true })
  @Column({ type: "varchar", length: 64 })
  username!: string;

  @Column({ type: "text", name: "password_hash" })
  passwordHash!: string;

  @Column({ type: "text", nullable: true })
  bio!: string | null;

  @Column({ type: "text", name: "profile_picture_url", nullable: true })
  profilePictureUrl!: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;

  @OneToMany(() => Post, (post) => post.author)
  posts!: Post[];

  @BeforeInsert()
  ensureId() {
    if (!this.id) this.id = randomUUID();
  }
}
