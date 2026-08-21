import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

const SESSION_KEY = 'lightning-rewards-session';

const token = (expiresAt = Date.now() + 60_000) => {
  const payload = window.btoa(JSON.stringify({ exp: Math.floor(expiresAt / 1000) }));
  return `header.${payload}.signature`;
};

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

function AuthHarness() {
  const { user, login, register, logout } = useAuth();

  return (
    <div>
      <span>{user?.email ?? 'signed out'}</span>
      <button
        type="button"
        onClick={() => login({ email: 'customer@example.com', password: 'password123' })}
      >
        Login action
      </button>
      <button
        type="button"
        onClick={() =>
          register({
            role: 'CUSTOMER',
            email: 'new@example.com',
            password: 'password123',
          })
        }
      >
        Register action
      </button>
      <button type="button" onClick={logout}>Logout action</button>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('logs in through the backend and persists the JWT session', async () => {
  fetch.mockResolvedValueOnce(
    jsonResponse({
      token: token(),
      user: {
        id: 'customer-id',
        email: 'customer@example.com',
        role: 'CUSTOMER',
        ndebitString: null,
      },
    }),
  );

  render(
    <AuthProvider>
      <AuthHarness />
    </AuthProvider>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Login action' }));

  expect(await screen.findByText('customer@example.com')).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    'http://localhost:3000/auth/login',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'customer@example.com', password: 'password123' }),
    }),
  );
  expect(JSON.parse(window.localStorage.getItem(SESSION_KEY))).toMatchObject({
    user: { id: 'customer-id', role: 'CUSTOMER' },
  });

  fireEvent.click(screen.getByRole('button', { name: 'Logout action' }));
  expect(await screen.findByText('signed out')).toBeInTheDocument();
  expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
});

test('registers through the backend and then creates a login session', async () => {
  fetch
    .mockResolvedValueOnce(
      jsonResponse({
        user: { id: 'new-id', email: 'new@example.com', role: 'CUSTOMER' },
      }, 201),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        token: token(),
        user: { id: 'new-id', email: 'new@example.com', role: 'CUSTOMER' },
      }),
    );

  render(
    <AuthProvider>
      <AuthHarness />
    </AuthProvider>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Register action' }));

  expect(await screen.findByText('new@example.com')).toBeInTheDocument();
  expect(fetch).toHaveBeenNthCalledWith(
    1,
    'http://localhost:3000/auth/register',
    expect.objectContaining({ method: 'POST' }),
  );
  expect(fetch).toHaveBeenNthCalledWith(
    2,
    'http://localhost:3000/auth/login',
    expect.objectContaining({ method: 'POST' }),
  );
});

test('restores a current session and redirects users away from the wrong role', async () => {
  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      token: token(),
      user: {
        id: 'business-id',
        email: 'new-business@example.com',
        role: 'BUSINESS',
      },
    }),
  );

  render(
    <MemoryRouter initialEntries={['/customer/cards']}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(
    await screen.findByRole('heading', { name: 'Business dashboard' }),
  ).toBeInTheDocument();
});

test('discards expired sessions and sends protected routes to login', async () => {
  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      token: token(Date.now() - 60_000),
      user: { id: 'customer-id', email: 'customer@example.com', role: 'CUSTOMER' },
    }),
  );

  render(
    <MemoryRouter initialEntries={['/customer/cards']}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
  await waitFor(() => expect(window.localStorage.getItem(SESSION_KEY)).toBeNull());
});
