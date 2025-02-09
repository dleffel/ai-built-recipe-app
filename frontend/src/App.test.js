import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Recipe App' })).toBeInTheDocument();
    expect(screen.getByText('Welcome to your recipe collection!')).toBeInTheDocument();
  });

  it('has correct header styling', () => {
    render(<App />);
    const header = screen.getByRole('banner');
    
    expect(header).toHaveClass('App-header');
    expect(header).toBeVisible();
  });

  it('matches snapshot', () => {
    const { container } = render(<App />);
    expect(container).toMatchSnapshot();
  });
});
