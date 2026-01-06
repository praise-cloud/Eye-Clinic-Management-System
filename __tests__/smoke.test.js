import React from 'react';
import { render, screen } from '@testing-library/react';

describe('Smoke test', () => {
  it('renders without crashing', () => {
    render(<div>Hello Test</div>);
    expect(screen.getByText('Hello Test')).toBeInTheDocument();
  });
});
