import {
  info as logInfo,
  warn as logWarn,
  error as logError,
  debug as logDebug,
  trace as logTrace,
} from "@tauri-apps/plugin-log";

/**
 * Enhanced logger that forwards logs to the Rust backend via tauri-plugin-log.
 * This ensures logs are persisted to the file system.
 */
export const logger = {
  info: async (message: string, ...args: unknown[]) => {
    // Also log to browser console for immediate dev feedback
    console.info(message, ...args);
    try {
      await logInfo(formatMessage(message, args));
    } catch (e) {
      console.error("Failed to log info to backend", e);
    }
  },

  warn: async (message: string, ...args: unknown[]) => {
    console.warn(message, ...args);
    try {
      await logWarn(formatMessage(message, args));
    } catch (e) {
      console.error("Failed to log warn to backend", e);
    }
  },

  error: async (message: string, ...args: unknown[]) => {
    console.error(message, ...args);
    try {
      await logError(formatMessage(message, args));
    } catch (e) {
      console.error("Failed to log error to backend", e);
    }
  },

  debug: async (message: string, ...args: unknown[]) => {
    console.debug(message, ...args);
    try {
      await logDebug(formatMessage(message, args));
    } catch (e) {
      console.error("Failed to log debug to backend", e);
    }
  },

  trace: async (message: string, ...args: unknown[]) => {
    console.trace(message, ...args);
    try {
      await logTrace(formatMessage(message, args));
    } catch (e) {
      console.error("Failed to log trace to backend", e);
    }
  },
};

function formatMessage(message: string, args: unknown[]): string {
  if (args.length === 0) return message;
  try {
    return `${message} ${args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg) : String(arg)
      )
      .join(" ")}`;
  } catch {
    return `${message} [Circular/Unserializable]`;
  }
}
