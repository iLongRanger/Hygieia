import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { Textarea } from '../Textarea';
import { createRef } from 'react';

describe('Textarea', () => {
  describe('Rendering', () => {
    it('should render textarea element', () => {
      render(<Textarea />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with label when provided', () => {
      render(<Textarea label="Description" />);
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should not render label when not provided', () => {
      const { container } = render(<Textarea />);
      const label = container.querySelector('label');
      expect(label).not.toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<Textarea placeholder="Enter your message..." />);
      expect(screen.getByPlaceholderText('Enter your message...')).toBeInTheDocument();
    });

    it('should render with default value', () => {
      render(<Textarea defaultValue="Default text" />);
      expect(screen.getByRole('textbox')).toHaveValue('Default text');
    });

    it('should render with controlled value', () => {
      render(<Textarea value="Controlled value" onChange={vi.fn()} />);
      expect(screen.getByRole('textbox')).toHaveValue('Controlled value');
    });
  });

  describe('Label', () => {
    it('should render label with correct styling', () => {
      const { container } = render(<Textarea label="Comments" />);
      const label = container.querySelector('label');
      expect(label).toHaveClass('mb-1.5', 'block', 'text-sm', 'font-medium', 'text-surface-700');
    });

    it('should associate label with textarea', () => {
      render(<Textarea label="Description" id="description" />);
      const label = screen.getByText('Description');
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('id', 'description');
    });

    it('should render complex label text', () => {
      render(<Textarea label="Bio (max 500 characters)" />);
      expect(screen.getByText('Bio (max 500 characters)')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should render error message when provided', () => {
      render(<Textarea error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should apply error styles when error is present', () => {
      render(<Textarea error="Invalid input" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('border-error-500', 'focus:border-error-500', 'focus:ring-error-500/20');
    });

    it('should not apply error styles when no error', () => {
      render(<Textarea />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).not.toHaveClass('border-error-500');
    });

    it('should render error with correct styling', () => {
      const { container } = render(<Textarea error="Error message" />);
      const errorElement = container.querySelector('.text-error-600');
      expect(errorElement).toHaveClass('text-xs', 'text-error-600');
    });

    it('should not render error element when no error', () => {
      const { container } = render(<Textarea />);
      const errorElement = container.querySelector('.text-error-600');
      expect(errorElement).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply base textarea styles', () => {
      render(<Textarea />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass(
        'flex',
        'min-h-[100px]',
        'w-full',
        'rounded-lg',
        'border',
        'border-surface-300',
        'bg-white',
        'px-3',
        'py-2',
        'text-surface-900',
        'resize-none'
      );
    });

    it('should apply focus styles', () => {
      render(<Textarea />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass(
        'focus:border-primary-500',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-primary-500/20'
      );
    });

    it('should apply placeholder styles', () => {
      render(<Textarea />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('placeholder:text-surface-400');
    });

    it('should apply disabled styles', () => {
      render(<Textarea disabled />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('disabled:cursor-not-allowed', 'disabled:bg-surface-100');
    });

    it('should apply transition styles', () => {
      render(<Textarea />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('transition-all', 'duration-200');
    });

    it('should accept custom className', () => {
      render(<Textarea className="custom-class" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('custom-class');
    });

    it('should merge custom className with default styles', () => {
      render(<Textarea className="min-h-[200px]" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('min-h-[200px]', 'rounded-lg', 'border');
    });
  });

  describe('User Interactions', () => {
    it('should allow text input', async () => {
      const user = userEvent.setup();
      render(<Textarea />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello World');

      expect(textarea).toHaveValue('Hello World');
    });

    it('should call onChange when text is entered', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Textarea onChange={onChange} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test');

      expect(onChange).toHaveBeenCalled();
    });

    it('should allow multiline text input', async () => {
      const user = userEvent.setup();
      render(<Textarea />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Line 1{Enter}Line 2{Enter}Line 3');

      expect(textarea).toHaveValue('Line 1\nLine 2\nLine 3');
    });

    it('should allow text selection and deletion', async () => {
      const user = userEvent.setup();
      render(<Textarea defaultValue="Hello World" />);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      expect(textarea).toHaveValue('');
    });

    it('should support copy and paste', async () => {
      const user = userEvent.setup();
      render(<Textarea />);

      const textarea = screen.getByRole('textbox');
      await user.click(textarea);
      await user.paste('Pasted text');

      expect(textarea).toHaveValue('Pasted text');
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Textarea disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should not be disabled when disabled prop is false', () => {
      render(<Textarea disabled={false} />);
      expect(screen.getByRole('textbox')).not.toBeDisabled();
    });

    it('should not accept input when disabled', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Textarea disabled onChange={onChange} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test');

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Readonly State', () => {
    it('should be readonly when readOnly prop is true', () => {
      render(<Textarea readOnly />);
      expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    });

    it('should not accept input when readonly', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Textarea readOnly value="Read only text" onChange={onChange} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test');

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Forwarded Ref', () => {
    it('should forward ref to textarea element', () => {
      const ref = createRef<HTMLTextAreaElement>();
      render(<Textarea ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    });

    it('should allow ref access to textarea methods', () => {
      const ref = createRef<HTMLTextAreaElement>();
      render(<Textarea ref={ref} />);
      expect(ref.current?.tagName).toBe('TEXTAREA');
    });

    it('should allow focus through ref', () => {
      const ref = createRef<HTMLTextAreaElement>();
      render(<Textarea ref={ref} />);
      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });

    it('should allow value access through ref', () => {
      const ref = createRef<HTMLTextAreaElement>();
      render(<Textarea ref={ref} defaultValue="Test value" />);
      expect(ref.current?.value).toBe('Test value');
    });
  });

  describe('HTML Attributes', () => {
    it('should accept id attribute', () => {
      render(<Textarea id="comment" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('id', 'comment');
    });

    it('should accept name attribute', () => {
      render(<Textarea name="description" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('name', 'description');
    });

    it('should accept maxLength attribute', () => {
      render(<Textarea maxLength={100} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '100');
    });

    it('should enforce maxLength', async () => {
      const user = userEvent.setup();
      render(<Textarea maxLength={5} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '1234567890');

      expect(textarea).toHaveValue('12345');
    });

    it('should accept rows attribute', () => {
      render(<Textarea rows={5} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5');
    });

    it('should accept cols attribute', () => {
      render(<Textarea cols={50} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('cols', '50');
    });

    it('should accept required attribute', () => {
      render(<Textarea required />);
      expect(screen.getByRole('textbox')).toBeRequired();
    });

    it('should accept aria-label attribute', () => {
      render(<Textarea aria-label="User comment" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'User comment');
    });

    it('should accept aria-describedby attribute', () => {
      render(<Textarea aria-describedby="comment-hint" />);
      expect(screen.getByRole('textbox')).toHaveAttribute(
        'aria-describedby',
        'comment-hint'
      );
    });
  });

  describe('Form Integration', () => {
    it('should work in a form', () => {
      render(
        <form>
          <Textarea name="message" />
          <button type="submit">Submit</button>
        </form>
      );

      expect(screen.getByRole('textbox')).toHaveAttribute('name', 'message');
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should be included in form submission', () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());
      render(
        <form onSubmit={handleSubmit}>
          <Textarea name="comment" defaultValue="Test comment" />
          <button type="submit">Submit</button>
        </form>
      );

      const form = screen.getByRole('button').closest('form');
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(handleSubmit).toHaveBeenCalled();
    });

    it('should support validation', () => {
      render(<Textarea required />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeRequired();
    });
  });

  describe('Use Cases', () => {
    it('should work as a comment field', () => {
      render(
        <Textarea
          label="Comment"
          placeholder="Add your comment..."
          rows={4}
        />
      );

      expect(screen.getByText('Comment')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Add your comment...')).toBeInTheDocument();
    });

    it('should work as a description field with validation', () => {
      render(
        <Textarea
          label="Description"
          placeholder="Enter description"
          required
          error="Description is required"
        />
      );

      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeRequired();
    });

    it('should work with character limit', async () => {
      const user = userEvent.setup();
      render(
        <Textarea
          label="Bio"
          placeholder="Tell us about yourself"
          maxLength={100}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'A'.repeat(150));

      expect(textarea).toHaveValue('A'.repeat(100));
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long text', async () => {
      const user = userEvent.setup();
      const longText = 'Lorem ipsum '.repeat(100);
      render(<Textarea />);

      const textarea = screen.getByRole('textbox');
      await user.click(textarea);
      await user.paste(longText);

      expect(textarea).toHaveValue(longText);
    });

    it('should handle special characters', async () => {
      const user = userEvent.setup();
      render(<Textarea />);

      const textarea = screen.getByRole('textbox');
      await user.click(textarea);
      await user.paste('<script>alert("XSS")</script>');

      expect(textarea).toHaveValue('<script>alert("XSS")</script>');
    });

    it('should handle empty error message', () => {
      render(<Textarea error="" />);
      const textarea = screen.getByRole('textbox');
      // Empty error string should not apply error styles
      expect(textarea).not.toHaveClass('border-error-500');
    });

    it('should handle error state changes', () => {
      const { rerender } = render(<Textarea />);
      let textarea = screen.getByRole('textbox');
      expect(textarea).not.toHaveClass('border-error-500');

      rerender(<Textarea error="Error message" />);
      textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('border-error-500');

      rerender(<Textarea />);
      textarea = screen.getByRole('textbox');
      expect(textarea).not.toHaveClass('border-error-500');
    });

    it('should handle rapid value changes', () => {
      const { rerender } = render(<Textarea value="Initial" onChange={vi.fn()} />);
      expect(screen.getByRole('textbox')).toHaveValue('Initial');

      rerender(<Textarea value="Updated" onChange={vi.fn()} />);
      expect(screen.getByRole('textbox')).toHaveValue('Updated');

      rerender(<Textarea value="" onChange={vi.fn()} />);
      expect(screen.getByRole('textbox')).toHaveValue('');
    });
  });

  describe('Accessibility', () => {
    it('should have proper role', () => {
      render(<Textarea />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should be focusable', () => {
      render(<Textarea />);
      const textarea = screen.getByRole('textbox');
      textarea.focus();
      expect(textarea).toHaveFocus();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<Textarea />);

      const textarea = screen.getByRole('textbox');
      await user.tab();

      expect(textarea).toHaveFocus();
    });

    it('should indicate required fields', () => {
      render(<Textarea required aria-required="true" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeRequired();
      expect(textarea).toHaveAttribute('aria-required', 'true');
    });

    it('should indicate invalid state', () => {
      render(<Textarea aria-invalid="true" error="Invalid input" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Display Name', () => {
    it('should have correct displayName for debugging', () => {
      expect(Textarea.displayName).toBe('Textarea');
    });
  });
});
