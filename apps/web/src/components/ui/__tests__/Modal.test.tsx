import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '../../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { Modal } from '../Modal';

describe('Modal', () => {
  beforeEach(() => {
    // Reset body overflow before each test
    document.body.style.overflow = 'unset';
  });

  afterEach(() => {
    // Clean up body overflow after each test
    document.body.style.overflow = 'unset';
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('should render title', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="My Modal Title">
          <div>Content</div>
        </Modal>
      );

      expect(screen.getByText('My Modal Title')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test">
          <div>
            <p>First paragraph</p>
            <p>Second paragraph</p>
          </div>
        </Modal>
      );

      expect(screen.getByText('First paragraph')).toBeInTheDocument();
      expect(screen.getByText('Second paragraph')).toBeInTheDocument();
    });

    it('should render close button with X icon', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test">
          <div>Content</div>
        </Modal>
      );

      const closeButton = screen.getByRole('button');
      expect(closeButton).toBeInTheDocument();

      // Check for X icon (lucide-react renders as SVG)
      const icon = closeButton.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render backdrop overlay', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test">
          <div>Content</div>
        </Modal>
      );

      const backdrop = container.querySelector('.bg-surface-900\\/50');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('should render with default medium size', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test">
          <div>Content</div>
        </Modal>
      );

      const modalContent = container.querySelector('.max-w-lg');
      expect(modalContent).toBeInTheDocument();
    });

    it('should render small size', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test" size="sm">
          <div>Content</div>
        </Modal>
      );

      const modalContent = container.querySelector('.max-w-md');
      expect(modalContent).toBeInTheDocument();
    });

    it('should render large size', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test" size="lg">
          <div>Content</div>
        </Modal>
      );

      const modalContent = container.querySelector('.max-w-2xl');
      expect(modalContent).toBeInTheDocument();
    });

    it('should render extra large size', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test" size="xl">
          <div>Content</div>
        </Modal>
      );

      const modalContent = container.querySelector('.max-w-4xl');
      expect(modalContent).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <Modal isOpen={true} onClose={handleClose} title="Test">
          <div>Content</div>
        </Modal>
      );

      const closeButton = screen.getByRole('button');
      await user.click(closeButton);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      const { container } = render(
        <Modal isOpen={true} onClose={handleClose} title="Test">
          <div>Content</div>
        </Modal>
      );

      const backdrop = container.querySelector('.bg-surface-900\\/50') as HTMLElement;
      await user.click(backdrop);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <Modal isOpen={true} onClose={handleClose} title="Test">
          <div>Content</div>
        </Modal>
      );

      await user.keyboard('{Escape}');

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when other keys are pressed', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <Modal isOpen={true} onClose={handleClose} title="Test">
          <div>Content</div>
        </Modal>
      );

      await user.keyboard('{Enter}');
      await user.keyboard('{Space}');
      await user.keyboard('a');

      expect(handleClose).not.toHaveBeenCalled();
    });

    it('should not call onClose when modal content is clicked', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <Modal isOpen={true} onClose={handleClose} title="Test">
          <div>Modal content</div>
        </Modal>
      );

      const content = screen.getByText('Modal content');
      await user.click(content);

      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('Body overflow handling', () => {
    it('should set body overflow to hidden when modal opens', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test">
          <div>Content</div>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body overflow when modal closes', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test">
          <div>Content</div>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <Modal isOpen={false} onClose={() => {}} title="Test">
          <div>Content</div>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('unset');
    });

    it('should restore body overflow when component unmounts', () => {
      const { unmount } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test">
          <div>Content</div>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Event listeners', () => {
    it('should add keydown listener when modal opens', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      render(
        <Modal isOpen={true} onClose={() => {}} title="Test">
          <div>Content</div>
        </Modal>
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });

    it('should remove keydown listener when modal closes', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { rerender } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test">
          <div>Content</div>
        </Modal>
      );

      rerender(
        <Modal isOpen={false} onClose={() => {}} title="Test">
          <div>Content</div>
        </Modal>
      );

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it('should remove keydown listener when component unmounts', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test">
          <div>Content</div>
        </Modal>
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Complex content', () => {
    it('should render forms within modal', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Form Modal">
          <form>
            <input type="text" placeholder="Name" />
            <button type="submit">Submit</button>
          </form>
        </Modal>
      );

      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    });

    it('should render multiple interactive elements', async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();

      render(
        <Modal isOpen={true} onClose={() => {}} title="Interactive Modal">
          <div>
            <input type="text" aria-label="input-field" />
            <select aria-label="select-field">
              <option>Option 1</option>
            </select>
            <button onClick={handleSubmit}>Action</button>
          </div>
        </Modal>
      );

      expect(screen.getByLabelText('input-field')).toBeInTheDocument();
      expect(screen.getByLabelText('select-field')).toBeInTheDocument();

      const actionButton = screen.getByRole('button', { name: 'Action' });
      await user.click(actionButton);

      expect(handleSubmit).toHaveBeenCalled();
    });

    it('should handle scrollable content', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Long Modal">
          <div>
            {Array.from({ length: 100 }, (_, i) => (
              <p key={i}>Line {i + 1}</p>
            ))}
          </div>
        </Modal>
      );

      const scrollableContent = container.querySelector('.overflow-y-auto');
      expect(scrollableContent).toBeInTheDocument();
      expect(scrollableContent).toHaveClass('max-h-[calc(100vh-200px)]');
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid open/close toggling', () => {
      const { rerender } = render(
        <Modal isOpen={false} onClose={() => {}} title="Test">
          <div>Content</div>
        </Modal>
      );

      // Rapidly toggle
      rerender(
        <Modal isOpen={true} onClose={() => {}} title="Test">
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByText('Test')).toBeInTheDocument();

      rerender(
        <Modal isOpen={false} onClose={() => {}} title="Test">
          <div>Content</div>
        </Modal>
      );
      expect(screen.queryByText('Test')).not.toBeInTheDocument();

      rerender(
        <Modal isOpen={true} onClose={() => {}} title="Test">
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should handle empty children', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Empty Modal">
          {null}
        </Modal>
      );

      expect(screen.getByText('Empty Modal')).toBeInTheDocument();
    });

    it('should handle very long titles', () => {
      const longTitle = 'This is a very long modal title that might cause layout issues if not handled properly';

      render(
        <Modal isOpen={true} onClose={() => {}} title={longTitle}>
          <div>Content</div>
        </Modal>
      );

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should maintain proper z-index layering', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test">
          <div>Content</div>
        </Modal>
      );

      const modalWrapper = container.querySelector('.z-50');
      expect(modalWrapper).toBeInTheDocument();
    });
  });
});
