# Test suite

Comprehensive unit + integration tests for the app, powered by **[Vitest](https://vitest.dev) 3** and **vitest-mock-extended**.

```bash
npm test            # run the whole suite once
npm run test:watch  # watch mode
npm run test:coverage  # v8 coverage report -> ./coverage
npx vitest run tests/integration/actions/finance.setInvoiceStatus.test.ts   # a single file
```

## Layout

```
tests/
├── setup.ts                 # global module mocks (loaded before every test)
├── helpers/
│   ├── prisma.ts            # deep-mocked Prisma client (`prismaMock`) + $transaction runner
│   ├── fixtures.ts          # entity factories (makeMember, makePaymentRequest, …) + dec()/id()
│   ├── auth.ts              # loginAsAdmin/loginAsMember/logout/setClerkUser + the mock fns
│   └── empty.ts             # stub aliased over `server-only` / `client-only`
├── unit/                    # pure functions, validators, resilience, auth, web-push
├── integration/
│   ├── actions/             # server actions (mocked Prisma)
│   ├── api/                 # route handlers
│   └── server/              # dashboard data aggregation
└── component/               # React client components (jsdom + Testing Library)
```

## How it works

`@/server/db` exports a `PrismaClient`, so it is replaced everywhere with a deep mock. Server actions are then
tested as **pure orchestration**: we set what the mock reads and assert what it writes (balance increments,
transaction creation, `Payment` upserts, `revalidatePath`, notifications) — no live database required.

### Globally mocked in `setup.ts`

| Module | Replacement |
| --- | --- |
| `@/server/db` | `prismaMock` (same object for `db` and `prisma`); `prisma.$transaction(cb)` runs `cb(prismaMock)` |
| `@/server/auth/ensureMember` / `ensureRole` | `vi.fn()` — configure with `tests/helpers/auth` |
| `@clerk/nextjs/server` | `auth`, `currentUser`, `clerkClient` mocks |
| `next/cache`, `next/navigation`, `next/headers` | no-op / sentinel-throwing mocks |
| `@/server/push/web-push` | push sends are stubbed (never hit the network) |

Every test starts (global `beforeEach`) as an **authenticated admin** with a reset Prisma mock. Override with
`loginAsMember()` / `logout()` to exercise authorization guards.

### Writing a new server-action test

```ts
import { describe, it, expect, vi } from "vitest";
import { prismaMock } from "../../helpers/prisma";
import { makePaymentRequest, makeMember } from "../../helpers/fixtures";
import { loginAsMember } from "../../helpers/auth";

// Mock notifications with ASYNC fns (some callers do `createNotification(...).catch(...)`).
vi.mock("@/server/actions/notifications", () => ({
  createNotification: vi.fn(async () => undefined),
}));

import { someAction } from "@/server/actions/whatever";

it("does the thing", async () => {
  prismaMock.paymentRequest.findUnique.mockResolvedValue(makePaymentRequest() as never);
  const res = await someAction("id");
  expect(res.success).toBe(true);
  expect(prismaMock.member.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: { balance: { increment: 750 } } })
  );
});
```

### Conventions

- Mock per-file any extra deps your source imports: `resend`, `uploadthing/server`, other `@/server/actions/*`.
- Control time when asserting period/date-derived values: `vi.setSystemTime(new Date("2026-06-15T12:00:00Z"))`.
- Component tests put `// @vitest-environment jsdom` as the first line and use `@testing-library/react`.
- Cast fixtures with `as never` where Prisma's generated types are stricter than the fixture shape.

> Not covered here: end-to-end browser tests (Playwright) — a separate layer that would drive the running app
> against a real database.
