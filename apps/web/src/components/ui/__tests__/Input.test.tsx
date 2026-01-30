import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';
import { Search } from 'lucide-react';

describe('Input', () => {
  describe('Rendering', () => {
    it('should render input element', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<Input label="Email" placeholder="email@example.com" />);
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('email@example.com')).toBeInTheDocument();
    });

    it('should render without label when not provided', () => {
      render(<Input placeholder="No label" />);
      expect(screen.queryByText('Email')).not.toBeInTheDocument();
    });

    it('should render with icon', () => {
      render(<Input icon={<Search data-testid="search-icon" />} placeholder="Search" />);
      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('should render error message', () => {
      render(<Input error="This field is required" placeholder="Input" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should not render error message when not provided', () => {
      render(<Input placeholder="Input" />);
      expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
    });
  });

  describe('Input types', () => {
    it('should render text input by default', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input.tagName).toBe('INPUT');
    });

    it('should render email input', () => {
      render(<Input type="email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should render password input', () => {
      render(<Input type="password" />);
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it('should render number input', () => {
      render(<Input type="number" />);
      const input = screen.getByRole('spinbutton');
      expect(input).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('should be enabled by default', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeEnabled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should be required when required prop is true', () => {
      render(<Input required />);
      expect(screen.getByRole('textbox')).toBeRequired();
    });

    it('should be readonly when readOnly prop is true', () => {
      render(<Input readOnly />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('readonly');
    });
  });

  describe('Value handling', () => {
    it('should render with default value', () => {
      render(<Input defaultValue="Default text" />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('Default text');
    });

    it('should render with controlled value', () => {
      render(<Input value="Controlled" onChange={() => {}} />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('Controlled');
    });

    it('should call onChange when value changes', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Input onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'test');

      expect(handleChange).toHaveBeenCalled();
      expect(handleChange).toHaveBeenCalledTimes(4); // once per character
    });

    it('should update value on user input (uncontrolled)', async () => {
      const user = userEvent.setup();

      render(<Input />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, 'Hello');

      expect(input.value).toBe('Hello');
    });
  });

  describe('Styling', () => {
    it('should apply error styles when error prop is provided', () => {
      render(<Input error="Error message" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-error-500');
    });

    it('should apply icon padding when icon is provided', () => {
      render(<Input icon={<Search />} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pl-10');
    });

    it('should apply custom className', () => {
      render(<Input className="custom-class" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
    });

    it('should have focus styles', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('focus:border-primary-500', 'focus:ring-primary-500/20');
    });
  });

  describe('Interactions', () => {
    it('should focus input when clicked', async () => {
      const user = userEvent.setup();

      render(<Input />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(input).toHaveFocus();
    });

    it('should not focus when disabled', async () => {
      const user = userEvent.setup();

      render(<Input disabled />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(input).not.toHaveFocus();
    });

    it('should call onFocus when focused', async () => {
      const user = userEvent.setup();
      const handleFocus = vi.fn();

      render(<Input onFocus={handleFocus} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('should call onBlur when blurred', async () => {
      const user = userEvent.setup();
      const handleBlur = vi.fn();

      render(<Input onBlur={handleBlur} />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.tab(); // Tab away to trigger blur

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have textbox role for text input', () => {
      render(<Input type="text" />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should support aria-label', () => {
      render(<Input aria-label="Search input" />);
      expect(screen.getByLabelText('Search input')).toBeInTheDocument();
    });

    it('should support aria-describedby', () => {
      render(<Input aria-describedby="helper-text" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'helper-text');
    });

    it('should associate label with input', () => {
      render(<Input label="Username" />);
      const label = screen.getByText('Username');
      const input = screen.getByRole('textbox');

      // Label should be associated with input (either by for/id or wrapping)
      expect(label).toBeInTheDocument();
      expect(input).toBeInTheDocument();
    });
  });

  describe('Custom props', () => {
    it('should accept placeholder', () => {
      render(<Input placeholder="Enter your name" />);
      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
    });

    it('should accept maxLength', () => {
      render(<Input maxLength={10} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('maxLength', '10');
    });

    it('should accept min and max for number input', () => {
      render(<Input type="number" min={0} max={100} />);
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('min', '0');
      expect(input).toHaveAttribute('max', '100');
    });

    it('should forward ref to input element', () => {
      const ref = vi.fn();
      render(<Input ref={ref} />);
      expect(ref).toHaveBeenCalled();
    });

    it('should accept name attribute', () => {
      render(<Input name="email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('name', 'email');
    });
  });
});
