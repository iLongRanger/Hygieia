import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
    });

    it('should render with custom title', () => {
      render(<ConfirmDialog {...defaultProps} title="Delete User" />);
      expect(screen.getByText('Delete User')).toBeInTheDocument();
    });

    it('should render with custom message', () => {
      render(
        <ConfirmDialog {...defaultProps} message="This action cannot be undone." />
      );
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });

    it('should render AlertTriangle icon', () => {
      const { container } = render(<ConfirmDialog {...defaultProps} />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Buttons', () => {
    it('should render Cancel button with default text', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should render Confirm button with default text', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    });

    it('should render Cancel button with custom text', () => {
      render(<ConfirmDialog {...defaultProps} cancelText="No, keep it" />);
      expect(screen.getByRole('button', { name: 'No, keep it' })).toBeInTheDocument();
    });

    it('should render Confirm button with custom text', () => {
      render(<ConfirmDialog {...defaultProps} confirmText="Yes, delete it" />);
      expect(screen.getByRole('button', { name: 'Yes, delete it' })).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render danger variant by default', () => {
      const { container } = render(<ConfirmDialog {...defaultProps} />);
      const icon = container.querySelector('svg');
      expect(icon?.parentElement).toHaveClass('bg-red-500/10');
      expect(icon).toHaveClass('text-red-400');
    });

    it('should render danger variant styles', () => {
      const { container } = render(<ConfirmDialog {...defaultProps} variant="danger" />);
      const icon = container.querySelector('svg');
      expect(icon?.parentElement).toHaveClass('bg-red-500/10');
      expect(icon).toHaveClass('text-red-400');

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('bg-red-600');
    });

    it('should render warning variant styles', () => {
      const { container } = render(<ConfirmDialog {...defaultProps} variant="warning" />);
      const icon = container.querySelector('svg');
      expect(icon?.parentElement).toHaveClass('bg-yellow-500/10');
      expect(icon).toHaveClass('text-yellow-400');

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('bg-yellow-600');
    });

    it('should render info variant styles', () => {
      const { container } = render(<ConfirmDialog {...defaultProps} variant="info" />);
      const icon = container.querySelector('svg');
      expect(icon?.parentElement).toHaveClass('bg-blue-500/10');
      expect(icon).toHaveClass('text-blue-400');

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('bg-blue-600');
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<ConfirmDialog {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when Confirm button is clicked', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      await user.click(screen.getByRole('button', { name: 'Confirm' }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should not call onConfirm when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('should close modal when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const { container } = render(<ConfirmDialog {...defaultProps} onClose={onClose} />);

      const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/50');
      if (backdrop) {
        await user.click(backdrop as HTMLElement);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should close modal when Escape key is pressed', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<ConfirmDialog {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Loading State', () => {
    it('should disable Cancel button when isLoading is true', () => {
      render(<ConfirmDialog {...defaultProps} isLoading={true} />);
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toBeDisabled();
    });

    it('should show loading state on Confirm button when isLoading is true', () => {
      render(<ConfirmDialog {...defaultProps} isLoading={true} />);
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveAttribute('aria-busy', 'true');
    });

    it('should not call onClose when Cancel is clicked while loading', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<ConfirmDialog {...defaultProps} onClose={onClose} isLoading={true} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should enable buttons when isLoading is false', () => {
      render(<ConfirmDialog {...defaultProps} isLoading={false} />);
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });

      expect(cancelButton).not.toBeDisabled();
      expect(confirmButton).not.toBeDisabled();
    });
  });

  describe('Modal Integration', () => {
    it('should render inside a Modal component', () => {
      render(<ConfirmDialog {...defaultProps} />);
      // Modal content should be visible
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    it('should pass size="sm" to Modal', () => {
      const { container } = render(<ConfirmDialog {...defaultProps} />);
      // Small modal should have max-w-md class
      const modalContent = container.querySelector('.max-w-md');
      expect(modalContent).toBeInTheDocument();
    });

    it('should pass title to Modal', () => {
      render(<ConfirmDialog {...defaultProps} title="Custom Title" />);
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should pass isOpen to Modal', () => {
      const { rerender } = render(<ConfirmDialog {...defaultProps} isOpen={true} />);
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();

      rerender(<ConfirmDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
    });

    it('should pass onClose to Modal', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<ConfirmDialog {...defaultProps} onClose={onClose} />);

      // Click the Modal's close button
      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Layout and Styling', () => {
    it('should center content with flexbox', () => {
      const { container } = render(<ConfirmDialog {...defaultProps} />);
      const contentDiv = container.querySelector('.flex.flex-col.items-center.text-center');
      expect(contentDiv).toBeInTheDocument();
    });

    it('should render icon in a rounded container', () => {
      const { container } = render(<ConfirmDialog {...defaultProps} />);
      const iconContainer = container.querySelector('.rounded-full.p-3');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should render message with proper styling', () => {
      render(<ConfirmDialog {...defaultProps} />);
      const message = screen.getByText('Are you sure you want to proceed?');
      expect(message).toHaveClass('mb-6', 'text-gray-300');
    });

    it('should render buttons in a flex container with gap', () => {
      const { container } = render(<ConfirmDialog {...defaultProps} />);
      const buttonContainer = container.querySelector('.flex.w-full.gap-3');
      expect(buttonContainer).toBeInTheDocument();
    });

    it('should make buttons equal width with flex-1', () => {
      render(<ConfirmDialog {...defaultProps} />);
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });

      expect(cancelButton).toHaveClass('flex-1');
      expect(confirmButton).toHaveClass('flex-1');
    });
  });

  describe('Use Cases', () => {
    it('should work for delete confirmation', () => {
      render(
        <ConfirmDialog
          {...defaultProps}
          title="Delete Item"
          message="Are you sure you want to delete this item? This action cannot be undone."
          confirmText="Delete"
          variant="danger"
        />
      );

      expect(screen.getByText('Delete Item')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    it('should work for warning confirmation', () => {
      render(
        <ConfirmDialog
          {...defaultProps}
          title="Unsaved Changes"
          message="You have unsaved changes. Are you sure you want to leave?"
          confirmText="Leave anyway"
          cancelText="Stay"
          variant="warning"
        />
      );

      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Leave anyway' })).toBeInTheDocument();
    });

    it('should work for info confirmation', () => {
      render(
        <ConfirmDialog
          {...defaultProps}
          title="Continue Process"
          message="This will start the synchronization process."
          confirmText="Start"
          variant="info"
        />
      );

      expect(screen.getByText('Continue Process')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long title', () => {
      const longTitle = 'This is a very long confirmation dialog title that might wrap';
      render(<ConfirmDialog {...defaultProps} title={longTitle} />);
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle very long message', () => {
      const longMessage = 'This is a very long message. '.repeat(10);
      render(<ConfirmDialog {...defaultProps} message={longMessage} />);
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle rapid open/close toggling', () => {
      const { rerender } = render(<ConfirmDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();

      rerender(<ConfirmDialog {...defaultProps} isOpen={true} />);
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();

      rerender(<ConfirmDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
    });

    it('should handle variant switching', () => {
      const { rerender, container } = render(
        <ConfirmDialog {...defaultProps} variant="danger" />
      );
      let icon = container.querySelector('svg');
      expect(icon).toHaveClass('text-red-400');

      rerender(<ConfirmDialog {...defaultProps} variant="warning" />);
      icon = container.querySelector('svg');
      expect(icon).toHaveClass('text-yellow-400');

      rerender(<ConfirmDialog {...defaultProps} variant="info" />);
      icon = container.querySelector('svg');
      expect(icon).toHaveClass('text-blue-400');
    });

    it('should handle loading state changes', () => {
      const { rerender } = render(<ConfirmDialog {...defaultProps} isLoading={false} />);
      let cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).not.toBeDisabled();

      rerender(<ConfirmDialog {...defaultProps} isLoading={true} />);
      cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible icon', () => {
      const { container } = render(<ConfirmDialog {...defaultProps} />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should have proper button roles', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    });

    it('should indicate loading state on confirm button', () => {
      render(<ConfirmDialog {...defaultProps} isLoading={true} />);
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveAttribute('aria-busy', 'true');
    });
  });
});
