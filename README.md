# Twitter-like Social Network — Phase 1 MVP

Production-ready Twitter-like social network built with Next.js (frontend + backend), PostgreSQL, TypeORM, Redis, and Swagger.

## Features

- User Authentication: Register, login, JWT-based auth with refresh token rotation
- User Profiles: View and edit profile (bio, profile picture)
- Posts: Create, view, edit, and delete your own text-based posts (280 char limit)
- Explore Feed: View all posts from all users

## Setup

Prerequisites: Node.js >= 20, PostgreSQL on localhost:5432, Redis on localhost:6379, pnpm

1. pnpm install
2. pnpm db:migrate
3. pnpm dev

API Docs: http://localhost:4000/api/docs
Frontend: http://localhost:3000
