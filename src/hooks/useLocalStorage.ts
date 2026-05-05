import { useState, useCallback } from 'react';

type SetValue<T> = (value: T | ((val: T) => T)) => void;
type RemoveValue = () => void;

/**
 * A type-safe hook for reading and writing a single localStorage key.
 * Returns [storedValue, setValue, removeValue].
 *
 * SSR-safe: falls back to initialValue when window is unavailable.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, SetValue<T>, RemoveValue] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue: SetValue<T> = useCallback(
    (value) => {
      try {
        const valueToStore =
          typeof value === 'function'
            ? (value as (val: T) => T)(storedValue)
            : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch {
        // noop — storage may be full or disabled
      }
    },
    [key, storedValue],
  );

  const removeValue: RemoveValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch {
      // noop
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
