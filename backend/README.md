# PMS Backend

Express.js, TypeScript, Prisma, and MySQL backend for the Project Management System.

## Current Milestone

The project scaffold is created from Milestone 1 and includes the database/auth foundation from Milestones 2 and 3.

## Setup

```bash
npm install
cp backend/.env.example backend/.env
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev:backend
```

The API defaults to:

```text
http://localhost:4100
```

Swagger API docs:

```text
http://localhost:4100/api-docs/
```

Raw OpenAPI JSON:

```text
http://localhost:4100/openapi.json
```

## Backend Structure

```text
src/
  config/
  controllers/
  services/
  repositories/
  middlewares/
  validators/
  routes/
  utils/
  jobs/
  types/
  prisma/
```

Milestone documents are tracked in:

```text
backend/docs/milestones/
```
