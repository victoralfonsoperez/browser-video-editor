import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { ToastContainer } from './ToastContainer';
import { ToastProvider, useToast } from '../../context/ToastContext';
import type { ToastVariant } from '../../context/ToastContext';

// Harness component that exposes showToast via a button
function ToastHarness({ message, variant }: { message: string; variant: ToastVariant }) {
  const { showToast } = useToast();
  return (
    <>
      <button onClick={() => showToast(message, variant)}>Show Toast</button>
      <ToastContainer />
    </>
  );
}

function renderWithToast(message: string, variant: ToastVariant) {
  return render(
    <ToastProvider>
      <ToastHarness message={message} variant={variant} />
    </ToastProvider>,
  );
}

describe('ToastContainer', () => {
  it('renders nothing when toast list is empty', () => {
    const { container } = render(
      <ToastProvider>
        <ToastContainer />
      </ToastProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the message text after showToast is called', async () => {
    renderWithToast('Something went wrong', 'error');
    await userEvent.click(screen.getByText('Show Toast'));
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders the correct icon for error variant (✕)', async () => {
    renderWithToast('Error toast', 'error');
    await userEvent.click(screen.getByText('Show Toast'));
    // The leading icon span contains ✕; the dismiss button also has ✕ but has aria-label
    const icons = screen.getAllByText('✕');
    // At least one should be the icon (without aria-label=Dismiss)
    const iconSpan = icons.find((el) => el.getAttribute('aria-label') !== 'Dismiss');
    expect(iconSpan).toBeTruthy();
  });

  it('renders the correct icon for success variant (✓)', async () => {
    renderWithToast('Success toast', 'success');
    await userEvent.click(screen.getByText('Show Toast'));
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('renders the correct icon for warning variant (⚠)', async () => {
    renderWithToast('Warning toast', 'warning');
    await userEvent.click(screen.getByText('Show Toast'));
    expect(screen.getByText('⚠')).toBeInTheDocument();
  });

  it('renders the correct icon for info variant (ℹ)', async () => {
    renderWithToast('Info toast', 'info');
    await userEvent.click(screen.getByText('Show Toast'));
    expect(screen.getByText('ℹ')).toBeInTheDocument();
  });

  it('dismiss button removes the toast', async () => {
    renderWithToast('Dismissable', 'info');
    await userEvent.click(screen.getByText('Show Toast'));
    expect(screen.getByText('Dismissable')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Dismissable')).not.toBeInTheDocument();
  });
});
