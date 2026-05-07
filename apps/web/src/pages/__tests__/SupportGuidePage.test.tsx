import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '../../test/test-utils';
import SupportGuidePage from '../support/SupportGuidePage';

describe('SupportGuidePage', () => {
  it('renders setup, workflow, and module guidance', () => {
    render(<SupportGuidePage />);

    expect(
      screen.getByRole('heading', { name: /how to use hygieia/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /initial setup checklist/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /full workflow/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /dashboard/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/configure pricing, tasks, people, and global settings/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /backup and restore/i })
    ).toBeInTheDocument();
  });

  it('switches module instructions', () => {
    render(<SupportGuidePage />);

    fireEvent.click(screen.getByRole('button', { name: /proposals/i }));

    expect(
      screen.getByRole('heading', { name: /proposals/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /one proposal engine for commercial, residential, and specialized work/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/calculate and populate pricing/i)
    ).toBeInTheDocument();
  });

  it('shows backup and restore guidance', () => {
    render(<SupportGuidePage />);

    fireEvent.click(
      screen.getByRole('button', { name: /backup and restore/i })
    );

    expect(
      screen.getByRole('heading', { name: /backup and restore/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/create and upload postgresql backups to r2/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/database restore is a server\/admin operation/i)
    ).toBeInTheDocument();
  });

  it('opens backup and restore from module query param', () => {
    render(<SupportGuidePage />, {
      initialRoute: '/support?module=backup-restore',
    });

    expect(
      screen.getByRole('heading', { name: /backup and restore/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/use pnpm run db:backup:scheduled/i)
    ).toBeInTheDocument();
  });
});
