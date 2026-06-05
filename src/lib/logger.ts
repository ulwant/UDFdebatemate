const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
} as const;

export const logger = {
  error: (message: string, context?: any) => {
    console.error(`[${LOG_LEVELS.ERROR}]`, message, context);
  },
  warn: (message: string, context?: any) => {
    console.warn(`[${LOG_LEVELS.WARN}]`, message, context);
  },
  info: (message: string, context?: any) => {
    console.info(`[${LOG_LEVELS.INFO}]`, message, context);
  },
  debug: (message: string, context?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${LOG_LEVELS.DEBUG}]`, message, context);
    }
  },
};
