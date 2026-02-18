import "server-only";

type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  operationName?: string;
};

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 120;
const DEFAULT_MAX_DELAY_MS = 1200;

const TRANSIENT_PATTERNS = [
  /Accelerate experienced an error communicating with your Query Engine/i,
  /Query timeout exceeded/i,
  /TypeError:\s*fetch failed/i,
  /UND_ERR_SOCKET/i,
  /SocketError/i,
  /other side closed/i,
];

function extractMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "";
}

function hasTransientPattern(error: unknown): boolean {
  const rootMessage = extractMessage(error);
  if (TRANSIENT_PATTERNS.some((pattern) => pattern.test(rootMessage))) {
    return true;
  }

  if (error && typeof error === "object" && "cause" in error) {
    return hasTransientPattern((error as { cause?: unknown }).cause);
  }

  return false;
}

function hasTransientCode(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeCode = (error as { code?: unknown }).code;
  if (maybeCode === "P6000") {
    return true;
  }

  if ("cause" in error) {
    return hasTransientCode((error as { cause?: unknown }).cause);
  }

  return false;
}

export function isTransientPrismaError(error: unknown): boolean {
  return hasTransientCode(error) || hasTransientPattern(error);
}

function computeBackoffDelayMs(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
  const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(baseDelayMs / 2)));
  return exponential + jitter;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withPrismaRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const operationName = options.operationName ?? "prisma-operation";

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const canRetry = attempt < attempts && isTransientPrismaError(error);
      if (!canRetry) {
        throw error;
      }

      const delayMs = computeBackoffDelayMs(attempt, baseDelayMs, maxDelayMs);
      console.warn(
        `[prisma-retry] ${operationName} failed (attempt ${attempt}/${attempts}); retrying in ${delayMs}ms`
      );
      await wait(delayMs);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`[prisma-retry] ${operationName} failed`);
}
