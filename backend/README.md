# Agriport — Backend (Phase 2)

> **Status:** Not started. The current phase is **frontend only**. This folder is a
> placeholder so the monorepo structure is in place for the Node.js API built next.

## Planned stack

| Component       | Technology              |
| --------------- | ----------------------- |
| Runtime         | Node.js 22 LTS          |
| Framework       | Express.js + TypeScript |
| Database        | MongoDB + Mongoose      |
| Auth            | JWT + Refresh tokens    |
| Validation      | Zod                     |
| Cache           | Redis                   |
| Queue           | BullMQ                  |
| File storage    | AWS S3                  |
| Docs            | Swagger                 |
| Logging         | Winston                 |

## Planned module structure (feature-based)

```
src/
├── config/
├── modules/
│   ├── auth/          # controller · service · repository · model · routes · validator
│   ├── users/
│   ├── products/
│   ├── inventory/
│   ├── orders/
│   ├── payments/
│   ├── crm/
│   ├── notifications/
│   └── reports/
├── middleware/
├── services/
├── utils/
├── jobs/
├── queues/
├── docs/
└── server.ts
```

The frontend's mock data layer (`frontend/src/mocks`) and RTK Query endpoints
(`frontend/src/redux/api.ts`) mirror the API contract this service will implement,
so swapping mocks for live endpoints is a focused change.
