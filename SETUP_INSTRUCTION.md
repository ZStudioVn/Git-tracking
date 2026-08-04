# Git Tracking - User Setup Instructions

This guide is for running the application locally. The source code and UI are already included; dependency installation and service configuration are the remaining setup steps.

## 1. Requirements

- Node.js 20 or newer
- npm 10 or newer (pnpm also works if preferred)
- PostgreSQL 15 or newer, or Docker Desktop
- A GitHub OAuth App

Check versions:

```bash
node --version
npm --version
```

## 2. Install dependencies

From the repository root:

```bash
npm install
```

Do not run database commands before this step because Prisma CLI and the generated client are installed with the project dependencies.

## 3. Start PostgreSQL

If using the included Docker Compose configuration:

```bash
docker compose up -d postgres
```

Alternatively, create a PostgreSQL database named `gittracking` and use its connection URL in the environment file.

## 4. Configure environment variables

Copy the template:

```bash
copy .env.example .env.local
```

On macOS/Linux use `cp .env.example .env.local`.

Set these values in `.env.local`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gittracking"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="a-long-random-secret"
GITHUB_CLIENT_ID="your-oauth-client-id"
GITHUB_CLIENT_SECRET="your-oauth-client-secret"
ENCRYPTION_KEY="a-32-byte-base64-key"
```

Generate secrets with:

```bash
openssl rand -base64 32
```

`ENCRYPTION_KEY` must remain stable after tokens have been stored. Changing it makes previously encrypted GitHub tokens unreadable.

## 5. Create the GitHub OAuth App

In GitHub, open **Settings → Developer settings → OAuth Apps → New OAuth App**.

For local development use:

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

Copy the client ID and generated secret into `.env.local`. The app requests `read:user` and `repo` access so it can inspect private repositories the user can access.

## 6. Prepare the database

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

For a disposable local database, `npm run db:push` is also available, but migrations are recommended for normal development.

## 7. Start the application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with GitHub, open `/setup`, enter the repository owner and name, then connect it. The dashboard provides repository information, commit history, sync status, and the diff workspace.

## 8. Useful commands

```bash
npm run typecheck
npm run lint
npm test
npm run db:studio
```

The current sync endpoint creates a database job. A production deployment still needs a continuously running worker or a scheduled process that calls `pollSyncJobs()`; the UI and job orchestration are present, but BullMQ is intentionally deferred.

## 9. Troubleshooting

- `Unauthorized`: verify that you are signed in and that `NEXTAUTH_SECRET` and OAuth callback URL match.
- `No repository connected`: visit `/setup` after signing in.
- `Repository not found or access denied`: check the repository owner/name and the OAuth account permissions.
- Prisma connection errors: verify PostgreSQL is running and `DATABASE_URL` matches it.
- Token decryption errors: restore the original `ENCRYPTION_KEY`; do not rotate it casually.

Never commit `.env.local`, OAuth secrets, database credentials, or encryption keys.