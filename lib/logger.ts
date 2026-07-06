type LogLevel = "info" | "warn" | "error" | "debug";

type LogContext = {
  requestId?: string;
  orgId?: string;
  userId?: string;
  route?: string;
  [key: string]: unknown;
};

function formatMessage(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  return JSON.stringify(payload);
}

export const logger = {
  info(message: string, context?: LogContext) {
    console.log(formatMessage("info", message, context));
  },
  warn(message: string, context?: LogContext) {
    console.warn(formatMessage("warn", message, context));
  },
  error(message: string, context?: LogContext) {
    console.error(formatMessage("error", message, context));
  },
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatMessage("debug", message, context));
    }
  },
};
