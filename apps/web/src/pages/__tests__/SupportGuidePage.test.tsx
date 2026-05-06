import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '../../test/test-utils';
import SupportGuidePage from '../support/SupportGuidePage';

describe('SupportGuidePage', () => {
  it('renders setup, workflow, and module guidance', () => {
    render(<SupportGuidePage />);

    expect(screen.getByRole('heading', { name: /how to use hygieia/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /initial setup checklist/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /full workflow/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/configure pricing, tasks, people, and global settings/i)).toBeInTheDocument();
  });

  it('switches module instructions', () => {
    render(<SupportGuidePage />);

    fireEvent.click(screen.getByRole('button', { name: /proposals/i }));

    expect(screen.getByRole('heading', { name: /proposals/i })).toBeInTheDocument();
    expect(screen.getByText(/one proposal engine for commercial, residential, and specialized work/i)).toBeInTheDocument();
    expect(screen.getByText(/calculate and populate pricing/i)).toBeInTheDocument();
  });
});
