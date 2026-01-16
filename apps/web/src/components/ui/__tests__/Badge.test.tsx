import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { Badge } from '../Badge';

describe('Badge', () => {
  describe('Rendering', () => {
    it('should render with children text', () => {
      render(<Badge>Active</Badge>);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render as a span element', () => {
      render(<Badge>Status</Badge>);
      const badge = screen.getByText('Status');
      expect(badge.tagName).toBe('SPAN');
    });

    it('should render with default variant when variant prop is not provided', () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-white/5', 'text-gray-300', 'border-white/10');
    });
  });

  describe('Variants', () => {
    it('should render success variant', () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText('Success');
      expect(badge).toHaveClass('bg-emerald/10', 'text-emerald', 'border-emerald/20');
    });

    it('should render warning variant', () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText('Warning');
      expect(badge).toHaveClass('bg-gold/10', 'text-gold', 'border-gold/20');
    });

    it('should render error variant', () => {
      render(<Badge variant="error">Error</Badge>);
      const badge = screen.getByText('Error');
      expect(badge).toHaveClass('bg-red-500/10', 'text-red-500', 'border-red-500/20');
    });

    it('should render info variant', () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText('Info');
      expect(badge).toHaveClass('bg-blue-500/10', 'text-blue-400', 'border-blue-500/20');
    });

    it('should render default variant explicitly', () => {
      render(<Badge variant="default">Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-white/5', 'text-gray-300', 'border-white/10');
    });
  });

  describe('Styling', () => {
    it('should apply base badge styles', () => {
      render(<Badge>Styled</Badge>);
      const badge = screen.getByText('Styled');
      expect(badge).toHaveClass(
        'inline-flex',
        'items-center',
        'rounded-full',
        'border',
        'px-2.5',
        'py-0.5',
        'text-xs',
        'font-medium',
        'transition-colors'
      );
    });

    it('should accept custom className', () => {
      render(<Badge className="custom-class">Custom</Badge>);
      const badge = screen.getByText('Custom');
      expect(badge).toHaveClass('custom-class');
    });

    it('should merge custom className with default styles', () => {
      render(<Badge className="ml-2">Merged</Badge>);
      const badge = screen.getByText('Merged');
      expect(badge).toHaveClass('ml-2', 'inline-flex', 'rounded-full');
    });
  });

  describe('HTML Attributes', () => {
    it('should accept and apply HTML span attributes', () => {
      render(<Badge data-testid="custom-badge">Attributes</Badge>);
      expect(screen.getByTestId('custom-badge')).toBeInTheDocument();
    });

    it('should accept id attribute', () => {
      render(<Badge id="badge-id">With ID</Badge>);
      const badge = screen.getByText('With ID');
      expect(badge).toHaveAttribute('id', 'badge-id');
    });

    it('should accept title attribute', () => {
      render(<Badge title="Badge tooltip">Tooltip</Badge>);
      const badge = screen.getByText('Tooltip');
      expect(badge).toHaveAttribute('title', 'Badge tooltip');
    });

    it('should accept aria-label attribute', () => {
      render(<Badge aria-label="Status badge">Active</Badge>);
      const badge = screen.getByText('Active');
      expect(badge).toHaveAttribute('aria-label', 'Status badge');
    });
  });

  describe('Content Rendering', () => {
    it('should render numeric content', () => {
      render(<Badge>{42}</Badge>);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should render empty content', () => {
      const { container } = render(<Badge></Badge>);
      const badge = container.querySelector('span');
      expect(badge).toBeInTheDocument();
      expect(badge?.textContent).toBe('');
    });

    it('should render multiple text nodes', () => {
      render(
        <Badge>
          Status: <strong>Active</strong>
        </Badge>
      );
      expect(screen.getByText(/Status:/)).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render special characters', () => {
      render(<Badge>100% Complete ✓</Badge>);
      expect(screen.getByText('100% Complete ✓')).toBeInTheDocument();
    });
  });

  describe('Use Cases', () => {
    it('should render status badge for active state', () => {
      render(<Badge variant="success">Active</Badge>);
      const badge = screen.getByText('Active');
      expect(badge).toHaveClass('text-emerald');
    });

    it('should render status badge for pending state', () => {
      render(<Badge variant="warning">Pending</Badge>);
      const badge = screen.getByText('Pending');
      expect(badge).toHaveClass('text-gold');
    });

    it('should render status badge for error state', () => {
      render(<Badge variant="error">Failed</Badge>);
      const badge = screen.getByText('Failed');
      expect(badge).toHaveClass('text-red-500');
    });

    it('should render count badge', () => {
      render(<Badge variant="info">3 new</Badge>);
      expect(screen.getByText('3 new')).toBeInTheDocument();
    });

    it('should render category badge', () => {
      render(<Badge variant="default">Category</Badge>);
      expect(screen.getByText('Category')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long text content', () => {
      const longText = 'This is a very long badge text that might overflow';
      render(<Badge>{longText}</Badge>);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('should handle single character content', () => {
      render(<Badge>A</Badge>);
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('should handle whitespace-only content', () => {
      render(<Badge>   </Badge>);
      const badge = screen.getByText(/^\s+$/);
      expect(badge).toBeInTheDocument();
    });

    it('should handle variant switching', () => {
      const { rerender } = render(<Badge variant="success">Test</Badge>);
      expect(screen.getByText('Test')).toHaveClass('text-emerald');

      rerender(<Badge variant="error">Test</Badge>);
      expect(screen.getByText('Test')).toHaveClass('text-red-500');
    });
  });

  describe('Accessibility', () => {
    it('should be accessible with screen readers', () => {
      render(<Badge role="status">Active</Badge>);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should support aria-live for dynamic content', () => {
      render(
        <Badge aria-live="polite" variant="success">
          Updated
        </Badge>
      );
      const badge = screen.getByText('Updated');
      expect(badge).toHaveAttribute('aria-live', 'polite');
    });
  });
});
