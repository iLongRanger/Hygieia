import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen } from '../../../test/test-utils';
import TimePeriodSelector from '../TimePeriodSelector';

describe('TimePeriodSelector', () => {
  it('changes preset period when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <TimePeriodSelector
        value="month"
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole('button', { name: /week/i }));
    expect(onChange).toHaveBeenCalledWith('week');
  });

  it('applies custom date range', async () => {
    const user = userEvent.setup();
    const onDateRangeChange = vi.fn();

    const { container } = render(
      <TimePeriodSelector
        value="custom"
        onChange={vi.fn()}
        dateFrom="2026-02-01"
        dateTo="2026-02-29"
        onDateRangeChange={onDateRangeChange}
      />
    );

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-01-01' } });
    fireEvent.change(dateInputs[1], { target: { value: '2026-01-31' } });
    await user.click(screen.getByRole('button', { name: /apply/i }));

    expect(onDateRangeChange).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
  });
});
