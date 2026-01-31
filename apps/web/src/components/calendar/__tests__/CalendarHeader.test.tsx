import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { CalendarHeader } from '../CalendarHeader';

describe('CalendarHeader', () => {
  const defaultProps = {
    currentDate: new Date(2026, 0, 1), // January 2026
    onPrevMonth: vi.fn(),
    onNextMonth: vi.fn(),
    onToday: vi.fn(),
  };

  describe('Rendering', () => {
    it('should display the month and year', () => {
      render(<CalendarHeader {...defaultProps} />);
      expect(screen.getByText('January 2026')).toBeInTheDocument();
    });

    it('should display navigation buttons', () => {
      render(<CalendarHeader {...defaultProps} />);
      expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
    });

    it('should display legend for appointment types', () => {
      render(<CalendarHeader {...defaultProps} />);
      expect(screen.getByText('Walk Through')).toBeInTheDocument();
      expect(screen.getByText('Visit')).toBeInTheDocument();
      expect(screen.getByText('Inspection')).toBeInTheDocument();
    });

    it('should display different months correctly', () => {
      const props = {
        ...defaultProps,
        currentDate: new Date(2026, 11, 15), // December 2026
      };
      render(<CalendarHeader {...props} />);
      expect(screen.getByText('December 2026')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should call onPrevMonth when previous button is clicked', async () => {
      const user = userEvent.setup();
      const onPrevMonth = vi.fn();

      render(<CalendarHeader {...defaultProps} onPrevMonth={onPrevMonth} />);

      const buttons = screen.getAllByRole('button');
      // First button with chevron is prev month
      await user.click(buttons[0]);

      expect(onPrevMonth).toHaveBeenCalledTimes(1);
    });

    it('should call onNextMonth when next button is clicked', async () => {
      const user = userEvent.setup();
      const onNextMonth = vi.fn();

      render(<CalendarHeader {...defaultProps} onNextMonth={onNextMonth} />);

      const buttons = screen.getAllByRole('button');
      // Second button with chevron is next month
      await user.click(buttons[1]);

      expect(onNextMonth).toHaveBeenCalledTimes(1);
    });

    it('should call onToday when today button is clicked', async () => {
      const user = userEvent.setup();
      const onToday = vi.fn();

      render(<CalendarHeader {...defaultProps} onToday={onToday} />);

      await user.click(screen.getByRole('button', { name: /today/i }));

      expect(onToday).toHaveBeenCalledTimes(1);
    });
  });
});
