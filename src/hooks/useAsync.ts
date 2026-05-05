import { useState, useCallback } from 'react';

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

type AsyncResult<T, Args extends unknown[]> = AsyncState<T> & {
  execute: (...args: Args) => Promise<void>;
  reset: () => void;
};

const IDLE: AsyncState<never> = { data: null, isLoading: false, error: null };

/**
 * Wraps an async function with loading / error / data state.
 *
 * @example
 * const { data, isLoading, error, execute } = useAsync(fetchPetitions);
 * // call it: execute(filters);
 */
export function useAsync<T, Args extends unknown[]>(
  asyncFn: (...args: Args) => Promise<T>,
): AsyncResult<T, Args> {
  const [state, setState] = useState<AsyncState<T>>(IDLE as AsyncState<T>);

  const execute = useCallback(
    async (...args: Args) => {
      setState({ data: null, isLoading: true, error: null });
      try {
        const result = await asyncFn(...args);
        setState({ data: result, isLoading: false, error: null });
      } catch (err) {
        setState({
          data: null,
          isLoading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [asyncFn],
  );

  const reset = useCallback(() => {
    setState(IDLE as AsyncState<T>);
  }, []);

  return { ...state, execute, reset };
}
