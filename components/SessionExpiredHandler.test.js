import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import SessionExpiredHandler from './SessionExpiredHandler';
import { useRouter } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('SessionExpiredHandler', () => {
  it('should redirect to /login when session-expired event is dispatched', () => {
    const push = jest.fn();
    useRouter.mockImplementation(() => ({
      push,
    }));

    render(<SessionExpiredHandler />);

    fireEvent(window, new CustomEvent('session-expired'));

    expect(push).toHaveBeenCalledWith('/login');
  });
});
