import {
  info as logInfo,
  warn as logWarn,
  error as logError,
  debug as logDebug,
  trace as logTrace,
} from "@tauri-apps/plugin-log";
import { toast } from "sonner";

/**
 * Enhanced logger that forwards logs to the Rust backend via tauri-plugin-log.
 * This ensures logs are persisted to the file system.
 */
export const logger = {
  /**
   * Logs an informational message.
   * @param {string} message - The message to log.
   * @param {...unknown[]} args - Additional arguments.
   */
  info: async (message: string, ...args: unknown[]) => {
    // Also log to browser console for immediate dev feedback
    console.info(message, ...args);
    try {
      await logInfo(formatMessage(message, args));
    } catch (e) {
      console.error("Failed to log info to backend", e);
    }
  },

  /**
   * Logs a warning message.
   * @param {string} message - The warning message.
   * @param {...unknown[]} args - Additional arguments.
   */
  warn: async (message: string, ...args: unknown[]) => {
    console.warn(message, ...args);
    try {
      await logWarn(formatMessage(message, args));
    } catch (e) {
      console.error("Failed to log warn to backend", e);
    }
  },

  /**
   * Logs an error message and displays a toast notification.
   * @param {string} message - The error message.
   * @param {...unknown[]} args - Additional arguments (e.g., error object).
   */
  error: async (message: string, ...args: unknown[]) => {
    console.error(message, ...args);
    // Visual feedback for errors
    toast.error(message, {
      description: args.length > 0 ? "Check logs for details" : undefined,
    });

    try {
      await logError(formatMessage(message, args));
    } catch (e) {
      console.error("Failed to log error to backend", e);
    }
  },

  /**
   * Logs a debug message.
   * @param {string} message - The debug message.
   * @param {...unknown[]} args - Additional arguments.
   */
  debug: async (message: string, ...args: unknown[]) => {
    console.debug(message, ...args);
    try {
      await logDebug(formatMessage(message, args));
    } catch (e) {
      console.error("Failed to log debug to backend", e);
    }
  },

  /**
   * Logs a trace message.
   * @param {string} message - The trace message.
   * @param {...unknown[]} args - Additional arguments.
   */
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
