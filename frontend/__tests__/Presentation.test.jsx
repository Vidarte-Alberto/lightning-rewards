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
  expect(screen.getByText('01 / 14')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /start presentation/i }));

  expect(screen.getByRole('heading', { name: /loyalty programs add friction/i })).toBeInTheDocument();
  expect(screen.getByText('02 / 14')).toBeInTheDocument();
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
  expect(screen.getByText('01 / 14')).toBeInTheDocument();
});

test('opens presenter notes for the active slide', () => {
  renderPresentation();

  fireEvent.click(screen.getByRole('button', { name: 'Notes' }));

  expect(screen.getByRole('complementary', { name: /presenter notes/i })).toHaveTextContent(
    /the payment itself should create loyalty/i,
  );
});

test('selects slides directly and exposes hybrid demo links', () => {
  renderPresentation();

  fireEvent.click(screen.getByRole('button', { name: /go to slide 13/i }));

  expect(screen.getByRole('heading', { name: /reliable product story/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /business login/i })).toHaveAttribute('href', '/login');
  expect(screen.getByRole('link', { name: /customer login/i })).toHaveAttribute('href', '/login');
});

test('explains each architecture layer interactively', () => {
  renderPresentation();

  fireEvent.click(screen.getByRole('button', { name: /go to slide 10/i }));
  fireEvent.click(screen.getByRole('button', { name: /prisma \+ postgresql/i }));

  expect(screen.getByText(/postgresql stores app state and encrypted wallet references/i)).toBeInTheDocument();
  expect(screen.getByText(/produces: auditable loyalty progress/i)).toBeInTheDocument();
});

test('lets the presenter inspect every CLINK message', () => {
  renderPresentation();

  fireEvent.click(screen.getByRole('button', { name: /go to slide 11/i }));
  fireEvent.click(screen.getByRole('button', { name: /pay invoice/i }));

  expect(screen.getByText(/lightning settlement · internal or routed/i)).toBeInTheDocument();
  expect(screen.getByText(/10,000 sat application limit/i)).toBeInTheDocument();
  expect(screen.getByText(/hosted balance, invoices, payments/i)).toBeInTheDocument();
});

test('creates a wallet inside the onboarding prototype', () => {
  renderPresentation();

  fireEvent.click(screen.getByRole('button', { name: /go to slide 5/i }));
  fireEvent.click(screen.getByRole('button', { name: /create my wallet/i }));

  expect(screen.getByRole('button', { name: /creating wallet/i })).toBeDisabled();
  expect(screen.getByText(/identity created/i)).toBeInTheDocument();
});

test('supports receiving and sending in the embedded wallet prototype', () => {
  renderPresentation();

  fireEvent.click(screen.getByRole('button', { name: /go to slide 6/i }));
  fireEvent.click(screen.getByRole('button', { name: 'receive' }));
  expect(screen.getByLabelText(/mock lightning invoice qr code/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'send' }));
  fireEvent.click(screen.getByRole('button', { name: /review payment/i }));
  fireEvent.click(screen.getByRole('button', { name: /pay now/i }));

  expect(screen.getByRole('heading', { name: /payment sent/i })).toBeInTheDocument();
  expect(screen.getByText(/new balance: 5,000 sats/i)).toBeInTheDocument();
});
