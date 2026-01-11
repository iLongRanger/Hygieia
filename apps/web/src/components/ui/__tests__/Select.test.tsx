import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { Select } from '../Select';

const mockOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

describe('Select', () => {
  describe('Rendering', () => {
    it('should render select element', () => {
      render(<Select options={mockOptions} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<Select label="Choose option" options={mockOptions} />);
      expect(screen.getByText('Choose option')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render without label when not provided', () => {
      render(<Select options={mockOptions} />);
      expect(screen.queryByText('Choose option')).not.toBeInTheDocument();
    });

    it('should render all options', () => {
      render(<Select options={mockOptions} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      const options = Array.from(select.options);

      expect(options).toHaveLength(3);
      expect(options[0]).toHaveTextContent('Option 1');
      expect(options[1]).toHaveTextContent('Option 2');
      expect(options[2]).toHaveTextContent('Option 3');
    });

    it('should render placeholder as first option when provided', () => {
      render(<Select options={mockOptions} placeholder="Select an option" />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      const firstOption = select.options[0];

      expect(firstOption).toHaveTextContent('Select an option');
      expect(firstOption).toHaveAttribute('value', '');
      expect(firstOption).toBeDisabled();
    });

    it('should render error message', () => {
      render(<Select options={mockOptions} error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should not render error message when not provided', () => {
      render(<Select options={mockOptions} />);
      expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
    });

    it('should render ChevronDown icon', () => {
      const { container } = render(<Select options={mockOptions} />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('should be enabled by default', () => {
      render(<Select options={mockOptions} />);
      expect(screen.getByRole('combobox')).toBeEnabled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Select options={mockOptions} disabled />);
      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('should be required when required prop is true', () => {
      render(<Select options={mockOptions} required />);
      expect(screen.getByRole('combobox')).toBeRequired();
    });
  });

  describe('Value handling', () => {
    it('should render with default value', () => {
      render(<Select options={mockOptions} defaultValue="option2" />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('option2');
    });

    it('should render with controlled value', () => {
      render(<Select options={mockOptions} value="option1" onChange={() => {}} />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('option1');
    });

    it('should call onChange with value string when selection changes', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Select options={mockOptions} onChange={handleChange} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'option2');

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith('option2');
    });

    it('should update value on user selection (uncontrolled)', async () => {
      const user = userEvent.setup();

      render(<Select options={mockOptions} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      await user.selectOptions(select, 'option3');

      expect(select.value).toBe('option3');
    });

    it('should render empty string when value is not set with placeholder', () => {
      render(<Select options={mockOptions} placeholder="Choose..." value="" onChange={() => {}} />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('');
    });

    it('should handle placeholder with controlled empty value', () => {
      render(
        <Select
          options={mockOptions}
          placeholder="Choose..."
          value=""
          onChange={() => {}}
        />
      );
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('');
      expect(select.options[0]).toHaveTextContent('Choose...');
    });
  });

  describe('Styling', () => {
    it('should apply error styles when error prop is provided', () => {
      render(<Select options={mockOptions} error="Error message" />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('border-red-500');
    });

    it('should apply custom className', () => {
      render(<Select options={mockOptions} className="custom-class" />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('custom-class');
    });

    it('should have focus styles', () => {
      render(<Select options={mockOptions} />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('focus:border-gold', 'focus:ring-gold');
    });

    it('should apply placeholder text color when no value selected', () => {
      render(<Select options={mockOptions} value="" onChange={() => {}} />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('text-gray-500');
    });

    it('should not apply placeholder text color when value is selected', () => {
      render(<Select options={mockOptions} value="option1" onChange={() => {}} />);
      const select = screen.getByRole('combobox');
      expect(select).not.toHaveClass('text-gray-500');
    });
  });

  describe('Interactions', () => {
    it('should focus select when clicked', async () => {
      const user = userEvent.setup();

      render(<Select options={mockOptions} />);

      const select = screen.getByRole('combobox');
      await user.click(select);

      expect(select).toHaveFocus();
    });

    it('should not focus when disabled', async () => {
      const user = userEvent.setup();

      render(<Select options={mockOptions} disabled />);

      const select = screen.getByRole('combobox');
      await user.click(select);

      expect(select).not.toHaveFocus();
    });

    it('should call onChange when different option selected', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Select options={mockOptions} value="option1" onChange={handleChange} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'option3');

      expect(handleChange).toHaveBeenCalledWith('option3');
    });

    it('should not call onChange when disabled', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Select options={mockOptions} disabled onChange={handleChange} />);

      const select = screen.getByRole('combobox');

      // Try to select option (should fail due to disabled)
      try {
        await user.selectOptions(select, 'option2');
      } catch {
        // Expected to fail
      }

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have combobox role', () => {
      render(<Select options={mockOptions} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should support aria-label', () => {
      render(<Select options={mockOptions} aria-label="Select option" />);
      expect(screen.getByLabelText('Select option')).toBeInTheDocument();
    });

    it('should support aria-describedby', () => {
      render(<Select options={mockOptions} aria-describedby="helper-text" />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-describedby', 'helper-text');
    });

    it('should associate label with select', () => {
      render(<Select label="Category" options={mockOptions} />);
      const label = screen.getByText('Category');
      const select = screen.getByRole('combobox');

      expect(label).toBeInTheDocument();
      expect(select).toBeInTheDocument();
    });

    it('should mark placeholder option as disabled', () => {
      render(<Select options={mockOptions} placeholder="Select..." />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      const placeholderOption = select.options[0];

      expect(placeholderOption).toBeDisabled();
    });
  });

  describe('Custom props', () => {
    it('should accept name attribute', () => {
      render(<Select options={mockOptions} name="category" />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('name', 'category');
    });

    it('should forward ref to select element', () => {
      const ref = vi.fn();
      render(<Select options={mockOptions} ref={ref} />);
      expect(ref).toHaveBeenCalled();
    });

    it('should handle empty options array', () => {
      render(<Select options={[]} />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.options).toHaveLength(0);
    });

    it('should render options with numeric values', () => {
      const numericOptions = [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' },
      ];
      render(<Select options={numericOptions} />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;

      expect(select.options[0].value).toBe('1');
      expect(select.options[1].value).toBe('2');
    });

    it('should accept id attribute', () => {
      render(<Select options={mockOptions} id="my-select" />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('id', 'my-select');
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in option labels', () => {
      const specialOptions = [
        { value: '1', label: 'Option with "quotes"' },
        { value: '2', label: "Option with 'apostrophes'" },
        { value: '3', label: 'Option with <brackets>' },
      ];
      render(<Select options={specialOptions} />);

      expect(screen.getByText('Option with "quotes"')).toBeInTheDocument();
      expect(screen.getByText("Option with 'apostrophes'")).toBeInTheDocument();
      expect(screen.getByText('Option with <brackets>')).toBeInTheDocument();
    });

    it('should handle very long option labels', () => {
      const longOptions = [
        { value: '1', label: 'This is a very long option label that might overflow the select element' },
      ];
      render(<Select options={longOptions} />);
      expect(screen.getByText(/This is a very long option/)).toBeInTheDocument();
    });

    it('should handle onChange being undefined', async () => {
      const user = userEvent.setup();

      render(<Select options={mockOptions} />);

      const select = screen.getByRole('combobox');

      // Should not throw error
      await user.selectOptions(select, 'option2');

      expect(select).toHaveValue('option2');
    });
  });
});
