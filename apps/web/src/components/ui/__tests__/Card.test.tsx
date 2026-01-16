import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { Card } from '../Card';
import { createRef } from 'react';

describe('Card', () => {
  describe('Rendering', () => {
    it('should render with children content', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render as a div element', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild;
      expect(card?.nodeName).toBe('DIV');
    });

    it('should render with padding by default', () => {
      const { container } = render(<Card>With padding</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-6');
    });

    it('should render without padding when noPadding is true', () => {
      const { container } = render(<Card noPadding>No padding</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).not.toHaveClass('p-6');
    });
  });

  describe('Styling', () => {
    it('should apply base card styles', () => {
      const { container } = render(<Card>Styled</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass(
        'relative',
        'overflow-hidden',
        'rounded-2xl',
        'border',
        'border-white/10',
        'bg-navy/50',
        'backdrop-blur-xl',
        'shadow-xl'
      );
    });

    it('should accept custom className', () => {
      const { container } = render(<Card className="custom-card">Custom</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('custom-card');
    });

    it('should merge custom className with default styles', () => {
      const { container } = render(<Card className="mt-4">Merged</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('mt-4', 'rounded-2xl', 'border');
    });

    it('should override default padding with custom className', () => {
      const { container } = render(<Card className="p-8">Custom padding</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-8');
    });
  });

  describe('Props - noPadding', () => {
    it('should not apply padding when noPadding is true', () => {
      const { container } = render(<Card noPadding>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).not.toHaveClass('p-6');
    });

    it('should apply padding when noPadding is false', () => {
      const { container } = render(<Card noPadding={false}>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-6');
    });

    it('should apply padding by default when noPadding is not provided', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-6');
    });
  });

  describe('Forwarded Ref', () => {
    it('should forward ref to div element', () => {
      const ref = createRef<HTMLDivElement>();
      render(<Card ref={ref}>Content</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should allow ref access to DOM methods', () => {
      const ref = createRef<HTMLDivElement>();
      render(<Card ref={ref}>Content</Card>);
      expect(ref.current?.tagName).toBe('DIV');
      expect(ref.current?.textContent).toBe('Content');
    });

    it('should update ref when component updates', () => {
      const ref = createRef<HTMLDivElement>();
      const { rerender } = render(<Card ref={ref}>Initial</Card>);
      expect(ref.current?.textContent).toBe('Initial');

      rerender(<Card ref={ref}>Updated</Card>);
      expect(ref.current?.textContent).toBe('Updated');
    });
  });

  describe('HTML Attributes', () => {
    it('should accept and apply HTML div attributes', () => {
      render(<Card data-testid="custom-card">Attributes</Card>);
      expect(screen.getByTestId('custom-card')).toBeInTheDocument();
    });

    it('should accept id attribute', () => {
      const { container } = render(<Card id="card-id">With ID</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('id', 'card-id');
    });

    it('should accept aria-label attribute', () => {
      const { container } = render(<Card aria-label="Information card">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('aria-label', 'Information card');
    });

    it('should accept role attribute', () => {
      const { container } = render(<Card role="region">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('role', 'region');
    });

    it('should accept onClick handler', () => {
      const handleClick = vi.fn();
      const { container } = render(<Card onClick={handleClick}>Clickable</Card>);
      const card = container.firstChild as HTMLElement;
      card.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Content Rendering', () => {
    it('should render simple text content', () => {
      render(<Card>Simple text</Card>);
      expect(screen.getByText('Simple text')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <Card>
          <h2>Title</h2>
          <p>Description</p>
        </Card>
      );
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should render complex nested content', () => {
      render(
        <Card>
          <div>
            <header>Header</header>
            <main>Main content</main>
            <footer>Footer</footer>
          </div>
        </Card>
      );
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Main content')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });

    it('should render with empty content', () => {
      const { container } = render(<Card></Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toBeInTheDocument();
      expect(card.textContent).toBe('');
    });

    it('should render with numeric content', () => {
      render(<Card>{42}</Card>);
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('Use Cases', () => {
    it('should work as a container for form content', () => {
      render(
        <Card>
          <form>
            <input type="text" placeholder="Name" />
            <button type="submit">Submit</button>
          </form>
        </Card>
      );
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    });

    it('should work as a dashboard widget container', () => {
      render(
        <Card>
          <h3>Statistics</h3>
          <div>Total Users: 1,234</div>
        </Card>
      );
      expect(screen.getByText('Statistics')).toBeInTheDocument();
      expect(screen.getByText('Total Users: 1,234')).toBeInTheDocument();
    });

    it('should work as a list item container', () => {
      render(
        <Card>
          <div>
            <h4>Task Title</h4>
            <p>Task description</p>
          </div>
        </Card>
      );
      expect(screen.getByText('Task Title')).toBeInTheDocument();
      expect(screen.getByText('Task description')).toBeInTheDocument();
    });

    it('should work with noPadding for custom layouts', () => {
      render(
        <Card noPadding>
          <div className="p-4 border-b">Header</div>
          <div className="p-4">Body</div>
        </Card>
      );
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Body')).toBeInTheDocument();
    });

    it('should work for image galleries with noPadding', () => {
      render(
        <Card noPadding>
          <img src="/test.jpg" alt="Test" />
        </Card>
      );
      expect(screen.getByAltText('Test')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long content', () => {
      const longText = 'Lorem ipsum '.repeat(100);
      const { container } = render(<Card>{longText}</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.textContent).toBe(longText);
    });

    it('should handle rapid prop changes', () => {
      const { rerender, container } = render(<Card noPadding>Content</Card>);
      let card = container.firstChild as HTMLElement;
      expect(card).not.toHaveClass('p-6');

      rerender(<Card noPadding={false}>Content</Card>);
      card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-6');

      rerender(<Card noPadding>Content</Card>);
      card = container.firstChild as HTMLElement;
      expect(card).not.toHaveClass('p-6');
    });

    it('should handle className changes', () => {
      const { rerender, container } = render(<Card className="bg-red-500">Content</Card>);
      let card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-red-500');

      rerender(<Card className="bg-blue-500">Content</Card>);
      card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-blue-500');
      expect(card).not.toHaveClass('bg-red-500');
    });
  });

  describe('Accessibility', () => {
    it('should be focusable when tabIndex is provided', () => {
      const { container } = render(<Card tabIndex={0}>Focusable</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should support aria-labelledby', () => {
      render(
        <div>
          <h2 id="card-title">Card Title</h2>
          <Card aria-labelledby="card-title">Content</Card>
        </div>
      );
      const card = screen.getByText('Content').closest('div');
      expect(card).toHaveAttribute('aria-labelledby', 'card-title');
    });

    it('should support aria-describedby', () => {
      const { container } = render(
        <Card aria-describedby="card-desc">Content</Card>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('aria-describedby', 'card-desc');
    });
  });

  describe('Display Name', () => {
    it('should have correct displayName for debugging', () => {
      expect(Card.displayName).toBe('Card');
    });
  });
});
