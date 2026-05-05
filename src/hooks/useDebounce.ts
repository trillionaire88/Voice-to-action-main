import { useState, useEffect } from 'react';

/**
 * Debounces a value by the given delay (default 300 ms).
 * Useful for search inputs that should wait for the user to stop typing
 * before firing an API call.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
