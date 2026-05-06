import { useEffect } from 'react';

const BASE_TITLE = 'Voice to Action';

/**
 * Sets the browser tab title. Restores the previous title on unmount.
 *
 * @example
 * useDocumentTitle('Petitions');  // "Petitions | Voice to Action"
 * useDocumentTitle();             // "Voice to Action"
 */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} | ${BASE_TITLE}` : BASE_TITLE;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
