import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { AuthProvider } from '../src/context/AuthContext';

const SESSION_KEY = 'lightning-rewards-session';

const createToken = () => {
  const payload = window.btoa(
    JSON.stringify({ exp: Math.floor((Date.now() + 60_000) / 1000) }),
  );
  return `header.${payload}.signature`;
};

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

const business = {
  id: 'business-id',
  name: 'Lightning Cafe',
  category: 'Cafe',
  description: 'Coffee paid over Lightning',
  stampsRequired: 5,
  rewardDescription: 'A free coffee',
  isActive: true,
};

const clinkSetup = {
  identity: {
    publicKeyHex: 'ab'.repeat(32),
    npub: 'npub1lightningrewards',
  },
  recommendedBudget: {
    amountSats: 20_000,
    frequency: 'monthly',
  },
};

const renderCustomerRoute = (route, ndebitString = 'ndebit1test') => {
  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      token: createToken(),
      user: {
        id: 'customer-id',
        email: 'customer@example.com',
        role: 'CUSTOMER',
        ndebitString,
      },
    }),
  );

  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
};

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('loads and filters businesses with authenticated customer progress', async () => {
  fetch.mockResolvedValueOnce(
    jsonResponse({
      businesses: [
        { ...business, myProgress: { currentStamps: 2, totalStampsEver: 4 } },
        {
          ...business,
          id: 'taco-id',
          name: 'Satoshi Tacos',
          category: 'Food',
          myProgress: null,
        },
      ],
    }),
  );

  renderCustomerRoute('/customer/discover');

  expect(await screen.findByRole('heading', { name: 'Lightning Cafe' })).toBeInTheDocument();
  expect(screen.getByText('2/5 stamps')).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    'http://localhost:3000/customers/me/businesses',
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer /) }),
    }),
  );

  fireEvent.change(screen.getByLabelText('Search businesses'), { target: { value: 'tacos' } });
  expect(screen.queryByRole('heading', { name: 'Lightning Cafe' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Satoshi Tacos' })).toBeInTheDocument();
});

test('loads loyalty cards from the backend', async () => {
  fetch.mockResolvedValueOnce(
    jsonResponse({
      cards: [
        {
          id: 'card-id',
          currentStamps: 3,
          totalStampsEver: 8,
          business,
        },
      ],
    }),
  );

  renderCustomerRoute('/customer/cards');

  expect(await screen.findByRole('heading', { name: 'Lightning Cafe' })).toBeInTheDocument();
  expect(screen.getByLabelText('3 of 5 stamps')).toBeInTheDocument();
  expect(screen.getByText(/8 total earned/)).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    'http://localhost:3000/customers/me/cards',
    expect.any(Object),
  );
});

test('connects a customer ndebit through the backend', async () => {
  fetch
    .mockResolvedValueOnce(jsonResponse({ clinkSetup }))
    .mockResolvedValueOnce(
      jsonResponse({
        user: {
          id: 'customer-id',
          email: 'customer@example.com',
          role: 'CUSTOMER',
          ndebitString: 'ndebit1connected',
        },
      }),
    );

  renderCustomerRoute('/customer/wallet', null);

  fireEvent.change(screen.getByLabelText('ShockWallet ndebit'), {
    target: { value: '  ndebit1connected  ' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Connect wallet' }));

  expect(await screen.findByText(/Wallet connected/)).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    'http://localhost:3000/customers/me',
    expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ ndebitString: 'ndebit1connected' }),
    }),
  );
  expect(screen.getByRole('heading', { name: 'Finish setup in ShockWallet' })).toBeInTheDocument();
});

test('shows the stable app identity and approval budget guidance', async () => {
  fetch.mockResolvedValueOnce(jsonResponse({ clinkSetup }));

  renderCustomerRoute('/customer/wallet');

  expect(
    await screen.findByRole('heading', { name: 'Finish setup in ShockWallet' }),
  ).toBeInTheDocument();
  expect(screen.getByDisplayValue('npub1lightningrewards')).toBeInTheDocument();
  expect(screen.getByText('Recommended budget: 20,000 sats/month')).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    'http://localhost:3000/customers/me/clink-setup',
    expect.any(Object),
  );
});

test('rejects a non-ndebit value before updating the customer wallet', async () => {
  fetch.mockResolvedValueOnce(jsonResponse({ clinkSetup }));

  renderCustomerRoute('/customer/wallet', null);

  fireEvent.change(screen.getByLabelText('ShockWallet ndebit'), {
    target: { value: 'noffer1wrongpointer' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Connect wallet' }));

  expect(await screen.findByText(/it should start with "ndebit1"/)).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('completes a real purchase and shows the awarded stamp', async () => {
  fetch
    .mockResolvedValueOnce(jsonResponse({ business }))
    .mockResolvedValueOnce(
      jsonResponse({
        outcome: 'paid',
        transaction: { id: 'transaction-id', status: 'PAID', amountSats: 1500 },
        loyalty: {
          card: { id: 'card-id', currentStamps: 4, totalStampsEver: 9 },
          reward: null,
          rewardUnlocked: false,
          stampsRequired: 5,
        },
      }),
    );

  renderCustomerRoute('/customer/purchase/business-id');

  const amountInput = await screen.findByLabelText('Amount (sats)');
  fireEvent.change(amountInput, { target: { value: '1500' } });
  fireEvent.click(screen.getByRole('button', { name: 'Pay with Lightning' }));

  expect(await screen.findByRole('heading', { name: 'Payment confirmed' })).toBeInTheDocument();
  expect(screen.getByText('You earned a stamp at Lightning Cafe.')).toBeInTheDocument();
  expect(screen.getByText('4/5 stamps collected')).toBeInTheDocument();

  const purchaseCall = fetch.mock.calls[1];
  expect(purchaseCall[0]).toBe('http://localhost:3000/payments/purchase');
  expect(purchaseCall[1]).toEqual(
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer /) }),
    }),
  );
  expect(JSON.parse(purchaseCall[1].body)).toEqual({
    businessId: 'business-id',
    amountSats: 1500,
    idempotencyKey: expect.any(String),
  });
});

test('tells the customer to open ShockWallet while approval is pending', async () => {
  fetch
    .mockResolvedValueOnce(jsonResponse({ business }))
    .mockImplementationOnce(() => new Promise(() => undefined));

  renderCustomerRoute('/customer/purchase/business-id');

  fireEvent.click(await screen.findByRole('button', { name: 'Pay with Lightning' }));

  expect(
    await screen.findByRole('heading', { name: 'Waiting for wallet approval…' }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Open ShockWallet and approve/)).toBeInTheDocument();
});

test('shows a reward when the confirmed payment completes the loyalty card', async () => {
  fetch
    .mockResolvedValueOnce(jsonResponse({ business }))
    .mockResolvedValueOnce(
      jsonResponse({
        outcome: 'paid',
        transaction: { id: 'reward-transaction-id', status: 'PAID', amountSats: 1000 },
        loyalty: {
          card: { id: 'card-id', currentStamps: 0, totalStampsEver: 10 },
          reward: { id: 'reward-id', description: 'A free coffee' },
          rewardUnlocked: true,
          stampsRequired: 5,
        },
      }),
    );

  renderCustomerRoute('/customer/purchase/business-id');

  fireEvent.click(await screen.findByRole('button', { name: 'Pay with Lightning' }));

  expect(await screen.findByText('🎉 Reward unlocked: A free coffee')).toBeInTheDocument();
});

test('distinguishes a declined wallet approval from a technical failure', async () => {
  fetch
    .mockResolvedValueOnce(jsonResponse({ business }))
    .mockResolvedValueOnce(
      jsonResponse(
        {
          outcome: 'denied',
          error: {
            code: 'CLINK_DEBIT_DENIED',
            message: 'The payment was not approved in your wallet.',
          },
        },
        422,
      ),
    );

  renderCustomerRoute('/customer/purchase/business-id');

  fireEvent.click(await screen.findByRole('button', { name: 'Pay with Lightning' }));

  expect(
    await screen.findByRole('heading', { name: 'Payment approval declined' }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Open ShockWallet and approve the next request/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Try payment again' })).toBeInTheDocument();
});

test('requires a connected wallet before starting a purchase', async () => {
  fetch.mockResolvedValueOnce(jsonResponse({ business }));

  renderCustomerRoute('/customer/purchase/business-id', null);

  expect(
    await screen.findByRole('heading', { name: 'Connect your wallet first' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Connect wallet' })).toHaveAttribute(
    'href',
    '/customer/wallet',
  );
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
});
