import { logger } from './logger';

export type SupabaseResult<T> = {
  data: T | null;
  error: string | null;
  count: number | null;
};

export async function fetchWithErrorHandling<T>(
  query: PromiseLike<{ data: T | null; error: any; count?: number | null }>
): Promise<SupabaseResult<T>> {
  try {
    const { data, error, count } = await query;
    
    if (error) {
      logger.error('Supabase query failed', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return {
        data: null,
        error: error.message || 'Terjadi kesalahan saat mengambil data.',
        count: null,
      };
    }

    return { data, error: null, count: count !== undefined ? count : null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Unexpected error in Supabase query', { message: errorMessage });
    return {
      data: null,
      error: errorMessage,
      count: null,
    };
  }
}
