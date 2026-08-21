import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import App from '../src/App';

test('renders the landing page at /', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole('heading', { level: 1, name: /loyalty stamps/i }),
  ).toBeInTheDocument();
});
