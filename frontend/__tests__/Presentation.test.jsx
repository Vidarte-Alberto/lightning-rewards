import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Presentation from '../src/pages/Presentation';

function renderPresentation() {
  render(
    <MemoryRouter>
      <Presentation />
    </MemoryRouter>,
  );
}

test('renders the first slide and starts the presentation', () => {
  renderPresentation();

  expect(
    screen.getByRole('heading', { level: 1, name: /every payment becomes/i }),
  ).toBeInTheDocument();
  expect(screen.getByText('01 / 10')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /start presentation/i }));

  expect(screen.getByRole('heading', { name: /loyalty programs add friction/i })).toBeInTheDocument();
  expect(screen.getByText('02 / 10')).toBeInTheDocument();
});

test('supports keyboard navigation across the deck', () => {
  renderPresentation();

  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(screen.getByRole('heading', { name: /loyalty programs add friction/i })).toBeInTheDocument();

  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  expect(screen.getByRole('heading', { level: 1, name: /every payment becomes/i })).toBeInTheDocument();

  fireEvent.keyDown(window, { key: 'End' });
  expect(screen.getByRole('heading', { name: /loyalty that happens/i })).toBeInTheDocument();

  fireEvent.keyDown(window, { key: 'Home' });
  expect(screen.getByText('01 / 10')).toBeInTheDocument();
});

test('opens presenter notes for the active slide', () => {
  renderPresentation();

  fireEvent.click(screen.getByRole('button', { name: 'Notes' }));

  expect(screen.getByRole('complementary', { name: /presenter notes/i })).toHaveTextContent(
    /the payment itself should create loyalty/i,
  );
});

test('selects slides directly and exposes live demo links', () => {
  renderPresentation();

  fireEvent.click(screen.getByRole('button', { name: /go to slide 9/i }));

  expect(screen.getByRole('heading', { name: /watch one payment travel/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /business login/i })).toHaveAttribute('href', '/login');
  expect(screen.getByRole('link', { name: /customer login/i })).toHaveAttribute('href', '/login');
});

test('explains each architecture layer interactively', () => {
  renderPresentation();

  fireEvent.click(screen.getByRole('button', { name: /go to slide 6/i }));
  fireEvent.click(screen.getByRole('button', { name: /prisma \+ postgresql/i }));

  expect(screen.getByText(/postgresql stores the durable business truth/i)).toBeInTheDocument();
  expect(screen.getByText(/produces: auditable loyalty progress/i)).toBeInTheDocument();
});

test('lets the presenter inspect every CLINK message', () => {
  renderPresentation();

  fireEvent.click(screen.getByRole('button', { name: /go to slide 7/i }));
  fireEvent.click(screen.getByRole('button', { name: /ndebit request/i }));

  expect(screen.getByText(/encrypted nostr event · kind 21002/i)).toBeInTheDocument();
  expect(screen.getByText(/the customer controls permission and budget/i)).toBeInTheDocument();
  expect(screen.getByText(/message transport.*not the lightning payment/i)).toBeInTheDocument();
});
