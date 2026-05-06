import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentTitle } from '../useDocumentTitle';

describe('useDocumentTitle', () => {
  const originalTitle = document.title;

  afterEach(() => {
    document.title = originalTitle;
  });

  it('sets the document title with the page name and app name', () => {
    renderHook(() => useDocumentTitle('Petitions'));
    expect(document.title).toBe('Petitions | Voice to Action');
  });

  it('sets only the base app title when called with no argument', () => {
    renderHook(() => useDocumentTitle());
    expect(document.title).toBe('Voice to Action');
  });

  it('sets only the base app title when called with undefined', () => {
    renderHook(() => useDocumentTitle(undefined));
    expect(document.title).toBe('Voice to Action');
  });

  it('restores the previous title when the component unmounts', () => {
    document.title = 'Previous page';
    const { unmount } = renderHook(() => useDocumentTitle('New Page'));
    expect(document.title).toBe('New Page | Voice to Action');
    unmount();
    expect(document.title).toBe('Previous page');
  });

  it('updates the title when the title prop changes', () => {
    const { rerender } = renderHook(
      ({ title }: { title: string }) => useDocumentTitle(title),
      { initialProps: { title: 'Page A' } },
    );
    expect(document.title).toBe('Page A | Voice to Action');

    rerender({ title: 'Page B' });
    expect(document.title).toBe('Page B | Voice to Action');
  });
});
