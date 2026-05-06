import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import ErrorBoundary from '../ErrorBoundary';

// Silence the expected console.error output that React emits for thrown errors
beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

/** Helper: renders a child that throws on demand. */
function ThrowOnRender({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test render error');
  return <div>Child content</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders the fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/encountered an error/i)).toBeInTheDocument();
  });

  it('shows "Try Again" and "Go Home" buttons in the error state', () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });

  it('resets to a working state when "Try Again" is clicked', async () => {
    const user = userEvent.setup();
    let shouldThrow = true;

    function RecoverableChild() {
      if (shouldThrow) throw new Error('Recoverable error');
      return <div>Recovered!</div>;
    }

    render(
      <ErrorBoundary>
        <RecoverableChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Fix the child so the next render succeeds
    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('Recovered!')).toBeInTheDocument();
  });
});
