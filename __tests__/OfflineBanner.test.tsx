import { render, screen, fireEvent } from '@testing-library/react';
import OfflineBanner from '@/components/OfflineBanner';

describe('OfflineBanner', () => {
  it('renders nothing when online', () => {
    render(<OfflineBanner />);
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
  });

  it('shows offline message when offline', () => {
    render(<OfflineBanner />);
    fireEvent(window, new Event('offline'));
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });

  it('hides message when coming back online', () => {
    render(<OfflineBanner />);
    fireEvent(window, new Event('offline'));
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
    fireEvent(window, new Event('online'));
    expect(screen.queryByText(/you are offline/i)).not.toBeInTheDocument();
  });
});
