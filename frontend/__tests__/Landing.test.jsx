import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Landing from '../src/pages/Landing';

function renderLanding() {
  render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
  );
}

test('renders the hero heading', () => {
  renderLanding();

  expect(
    screen.getByRole('heading', { level: 1, name: /loyalty stamps/i }),
  ).toBeInTheDocument();
});

test('renders the how it works section', () => {
  renderLanding();

  expect(screen.getByRole('heading', { level: 2, name: /how it works/i })).toBeInTheDocument();
});

test('renders the benefits section', () => {
  renderLanding();

  expect(screen.getByRole('heading', { level: 2, name: /benefits/i })).toBeInTheDocument();
});
