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
  ownerId: 'owner-id',
  name: 'Lightning Cafe',
  category: 'Cafe',
  nofferString: 'noffer1test',
  stampsRequired: 5,
  rewardDescription: 'A free coffee',
  isActive: true,
};

const renderBusinessRoute = (route) => {
  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      token: createToken(),
      user: {
        id: 'owner-id',
        email: 'owner@example.com',
        role: 'BUSINESS',
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

test('loads the business dashboard and customer progress from the backend', async () => {
  fetch
    .mockResolvedValueOnce(jsonResponse({ business }))
    .mockResolvedValueOnce(
      jsonResponse({
        customers: [
          {
            id: 'card-id',
            currentStamps: 3,
            totalStampsEver: 8,
            customer: { id: 'customer-id', email: 'customer@example.com' },
          },
        ],
      }),
    );

  renderBusinessRoute('/business/dashboard');

  expect(
    await screen.findByRole('heading', { name: 'Lightning Cafe' }),
  ).toBeInTheDocument();
  expect(screen.getByText('customer@example.com')).toBeInTheDocument();
  expect(screen.getByText('3/5')).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    'http://localhost:3000/businesses/me',
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer /) }),
    }),
  );
  expect(fetch).toHaveBeenCalledWith(
    'http://localhost:3000/businesses/me/customers',
    expect.any(Object),
  );
});

test('loads and updates loyalty program settings', async () => {
  fetch
    .mockResolvedValueOnce(jsonResponse({ business }))
    .mockResolvedValueOnce(
      jsonResponse({ offerStatus: { status: 'available', checkedAt: '2026-08-21' } }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        business: { ...business, stampsRequired: 7, rewardDescription: 'A free brunch' },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({ offerStatus: { status: 'available', checkedAt: '2026-08-21' } }),
    );

  renderBusinessRoute('/business/settings');

  const stampsInput = await screen.findByLabelText('Stamps required');
  const rewardInput = screen.getByLabelText('Reward description');

  fireEvent.change(stampsInput, { target: { value: '7' } });
  fireEvent.change(rewardInput, { target: { value: 'A free brunch' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

  expect(await screen.findByText('Program updated.')).toBeInTheDocument();
  expect(fetch).toHaveBeenNthCalledWith(
    3,
    'http://localhost:3000/businesses/me',
    expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({
        stampsRequired: 7,
        rewardDescription: 'A free brunch',
        nofferString: 'noffer1test',
      }),
    }),
  );
  expect(screen.getByText('Offer available')).toBeInTheDocument();
});

test('shows when the configured Lightning.Pub offer is unavailable', async () => {
  fetch
    .mockResolvedValueOnce(jsonResponse({ business }))
    .mockResolvedValueOnce(
      jsonResponse({
        offerStatus: {
          status: 'unavailable',
          code: 'CLINK_OFFER_TIMEOUT',
          message: 'Lightning.Pub did not respond to the test invoice request.',
        },
      }),
    );

  renderBusinessRoute('/business/settings');

  expect(await screen.findByText('Offer unavailable')).toBeInTheDocument();
  expect(
    screen.getByText('Lightning.Pub did not respond to the test invoice request.'),
  ).toBeInTheDocument();
});

test('rejects a non-CLINK offer before saving settings', async () => {
  fetch
    .mockResolvedValueOnce(jsonResponse({ business }))
    .mockResolvedValueOnce(
      jsonResponse({ offerStatus: { status: 'available', checkedAt: '2026-08-21' } }),
    );

  renderBusinessRoute('/business/settings');

  const offerInput = await screen.findByLabelText('Lightning.Pub offer');
  await screen.findByText('Offer available');
  fireEvent.change(offerInput, { target: { value: 'npub1wrong' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

  expect(
    await screen.findByText('Paste a CLINK offer that starts with noffer1.'),
  ).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(2);
});

test('loads the authenticated business transaction history', async () => {
  fetch.mockResolvedValueOnce(
    jsonResponse({
      transactions: [
        {
          id: 'transaction-id',
          amountSats: 2500,
          status: 'PAID',
          createdAt: '2026-08-21T00:00:00.000Z',
          customer: { id: 'customer-id', email: 'customer@example.com' },
        },
      ],
    }),
  );

  renderBusinessRoute('/business/transactions');

  expect(await screen.findByText('customer@example.com')).toBeInTheDocument();
  expect(screen.getByText('2500 sats')).toBeInTheDocument();
  expect(screen.getByText('PAID')).toBeInTheDocument();
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/businesses/me/transactions',
      expect.any(Object),
    ),
  );
});

test('creates and archives products in the business catalog', async () => {
  fetch
    .mockResolvedValueOnce(jsonResponse({ products: [] }))
    .mockResolvedValueOnce(jsonResponse({
      product: {
        id: 'latte-id',
        businessId: business.id,
        name: 'House Latte',
        description: 'Espresso and milk',
        priceCurrency: 'SATS',
        priceSats: 150,
        isActive: true,
      },
    }), 201)
    .mockResolvedValueOnce(jsonResponse({
      product: {
        id: 'latte-id',
        businessId: business.id,
        name: 'House Latte',
        description: 'Espresso and milk',
        priceCurrency: 'SATS',
        priceSats: 150,
        isActive: false,
      },
    }));

  renderBusinessRoute('/business/products');

  await screen.findByText('No products yet. Add your first item above.');
  fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'House Latte' } });
  fireEvent.change(screen.getByLabelText('Description (optional)'), { target: { value: 'Espresso and milk' } });
  fireEvent.change(screen.getByLabelText('Price (sats)'), { target: { value: '150' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add product' }));

  expect(await screen.findByRole('heading', { name: 'House Latte' })).toBeInTheDocument();
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
    name: 'House Latte',
    description: 'Espresso and milk',
    priceCurrency: 'SATS',
    priceSats: 150,
  });

  fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
  expect(await screen.findByText('Archived')).toBeInTheDocument();
  expect(fetch.mock.calls[2][1]).toEqual(expect.objectContaining({ method: 'DELETE' }));
});

test('creates a product priced in MXN and shows its converted sats estimate', async () => {
  fetch
    .mockResolvedValueOnce(jsonResponse({ products: [] }))
    .mockResolvedValueOnce(jsonResponse({
      product: {
        id: 'mxn-latte-id',
        businessId: business.id,
        name: 'MXN Latte',
        description: null,
        priceCurrency: 'MXN',
        priceMxnCents: 5_000,
        priceSats: 2_500,
        isActive: true,
      },
    }), 201);

  renderBusinessRoute('/business/products');

  await screen.findByText('No products yet. Add your first item above.');
  fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'MXN Latte' } });
  fireEvent.change(screen.getByLabelText('Price currency'), { target: { value: 'MXN' } });
  fireEvent.change(screen.getByLabelText('Price (MXN)'), { target: { value: '50' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add product' }));

  expect(await screen.findByText('≈ 2,500 sats at the latest rate')).toBeInTheDocument();
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
    name: 'MXN Latte',
    description: '',
    priceCurrency: 'MXN',
    priceMxn: 50,
  });
});
