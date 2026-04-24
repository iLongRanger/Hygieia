import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { TimeSelect } from '../TimeSelect';

describe('TimeSelect', () => {
  it('renders readable 12-hour time labels while keeping HH:mm values', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<TimeSelect label="Start Time" value="09:00" onChange={handleChange} />);

    const select = screen.getByLabelText(/start time/i) as HTMLSelectElement;
    expect(select.value).toBe('09:00');
    expect(screen.getByRole('option', { name: '9:00 AM' })).toHaveValue('09:00');
    expect(screen.getByRole('option', { name: '2:30 PM' })).toHaveValue('14:30');

    await user.selectOptions(select, '14:30');

    expect(handleChange).toHaveBeenCalledWith('14:30');
  });

  it('keeps a non-standard current value available as an option', () => {
    render(<TimeSelect label="End Time" value="23:59" onChange={() => {}} />);

    expect(screen.getByLabelText(/end time/i)).toHaveValue('23:59');
    expect(screen.getByRole('option', { name: '11:59 PM' })).toHaveValue('23:59');
  });
});

