const STORAGE_KEY = 'lightning-rewards-mock-store';

const FORCED_FAILURE_AMOUNT_SATS = 13;
const DEBIT_MIN_DELAY_MS = 2000;
const DEBIT_MAX_DELAY_MS = 4000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = (minMs, maxMs) => minMs + Math.random() * (maxMs - minMs);
const generateId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const seedState = () => ({
  businesses: [
    {
      id: 'business-cafe',
      ownerId: 'user-owner-cafe',
      name: 'Café Relámpago',
      category: 'Coffee shop',
      nofferString: 'noffer-demo-cafe',
      stampsRequired: 5,
      rewardDescription: 'A free house drink',
      logoUrl: null,
      description: 'Fresh coffee, paid instantly over Lightning.',
      isActive: true,
    },
    {
      id: 'business-tacos',
      ownerId: 'user-owner-tacos',
      name: 'Tacos Satoshi',
      category: 'Restaurant',
      nofferString: 'noffer-demo-tacos',
      stampsRequired: 5,
      rewardDescription: 'A free taco order',
      logoUrl: null,
      description: 'Tacos al pastor, sats accepted.',
      isActive: true,
    },
    {
      id: 'business-bici',
      ownerId: 'user-owner-bici',
      name: 'Bici Bitcoin',
      category: 'Bike shop',
      nofferString: 'noffer-demo-bici',
      stampsRequired: 5,
      rewardDescription: 'A free basic tune-up',
      logoUrl: null,
      description: 'Bike repairs and parts.',
      isActive: true,
    },
  ],
  users: [
    { id: 'user-owner-cafe', email: 'cafe@lightning-rewards.local', password: 'DemoPass123!', role: 'BUSINESS', ndebitString: null },
    { id: 'user-owner-tacos', email: 'tacos@lightning-rewards.local', password: 'DemoPass123!', role: 'BUSINESS', ndebitString: null },
    { id: 'user-owner-bici', email: 'bici@lightning-rewards.local', password: 'DemoPass123!', role: 'BUSINESS', ndebitString: null },
    { id: 'user-customer-demo', email: 'customer@lightning-rewards.local', password: 'DemoPass123!', role: 'CUSTOMER', ndebitString: null },
  ],
  loyaltyCards: [
    { id: 'card-demo-cafe', businessId: 'business-cafe', customerId: 'user-customer-demo', currentStamps: 2, totalStampsEver: 2 },
    { id: 'card-demo-tacos', businessId: 'business-tacos', customerId: 'user-customer-demo', currentStamps: 4, totalStampsEver: 4 },
  ],
  transactions: [],
});

const loadState = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    return JSON.parse(raw);
  } catch {
    return seedState();
  }
};

let state = loadState();

const persist = () => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    return;
  }
};

const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  ndebitString: user.ndebitString,
});

const withMyProgress = (business, customerId) => {
  if (!customerId) return { ...business, myProgress: null };

  const card = state.loyaltyCards.find(
    (candidate) => candidate.businessId === business.id && candidate.customerId === customerId,
  );

  return { ...business, myProgress: card ? { currentStamps: card.currentStamps, totalStampsEver: card.totalStampsEver } : null };
};

export const listBusinesses = ({ category, search, customerId } = {}) => {
  const normalizedSearch = search ? search.trim().toLowerCase() : '';

  return state.businesses
    .filter((business) => business.isActive)
    .filter((business) => !category || business.category === category)
    .filter((business) => !normalizedSearch || business.name.toLowerCase().includes(normalizedSearch))
    .map((business) => withMyProgress(business, customerId));
};

export const getBusinessById = (businessId) => {
  const business = state.businesses.find((candidate) => candidate.id === businessId);
  if (!business) throw new Error('Business not found');
  return business;
};

export const getBusinessByOwnerId = (ownerId) => {
  const business = state.businesses.find((candidate) => candidate.ownerId === ownerId);
  if (!business) throw new Error('Business not found');
  return business;
};

export const findMockBusinessForUser = (user) => {
  const mockOwner = state.users.find(
    (candidate) => candidate.id === user.id || candidate.email === user.email,
  );

  if (!mockOwner) return null;
  return state.businesses.find((candidate) => candidate.ownerId === mockOwner.id) ?? null;
};

export const updateBusiness = async (businessId, updates) => {
  const business = state.businesses.find((candidate) => candidate.id === businessId);
  if (!business) throw new Error('Business not found');

  Object.assign(business, updates);
  persist();
  return business;
};

export const getCustomerCards = (customerId) =>
  state.loyaltyCards
    .filter((card) => card.customerId === customerId)
    .map((card) => ({ ...card, business: getBusinessById(card.businessId) }));

export const getBusinessCustomers = (businessId) =>
  state.loyaltyCards
    .filter((card) => card.businessId === businessId)
    .map((card) => ({ ...card, customer: toPublicUser(state.users.find((user) => user.id === card.customerId)) }));

export const getBusinessTransactions = (businessId) =>
  state.transactions
    .filter((transaction) => transaction.businessId === businessId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

const fakeBolt11 = (amountSats) => `lnbcmock${amountSats * 1000}${generateId('x')}`;
const fakePreimage = () => generateId('preimage').replace(/-/g, '');

export const purchase = async ({ businessId, customerId, amountSats }) => {
  const business = getBusinessById(businessId);
  const customer = state.users.find((user) => user.id === customerId);

  if (!customer) throw new Error('Customer not found');
  if (!customer.ndebitString) throw new Error('Connect your wallet before making a purchase');
  if (!amountSats || amountSats <= 0) throw new Error('amountSats must be greater than 0');

  const transaction = {
    id: generateId('tx'),
    businessId,
    customerId,
    amountSats,
    bolt11: fakeBolt11(amountSats),
    preimage: null,
    status: 'PENDING',
    failureCode: null,
    createdAt: new Date().toISOString(),
    paidAt: null,
  };
  state.transactions.push(transaction);
  persist();

  await wait(randomDelay(DEBIT_MIN_DELAY_MS, DEBIT_MAX_DELAY_MS));

  if (amountSats === FORCED_FAILURE_AMOUNT_SATS) {
    transaction.status = 'FAILED';
    transaction.failureCode = 'customer_declined';
    persist();
    return { transaction, rewardUnlocked: false, reward: null };
  }

  transaction.status = 'PAID';
  transaction.preimage = fakePreimage();
  transaction.paidAt = new Date().toISOString();

  let card = state.loyaltyCards.find(
    (candidate) => candidate.businessId === businessId && candidate.customerId === customerId,
  );

  if (!card) {
    card = { id: generateId('card'), businessId, customerId, currentStamps: 0, totalStampsEver: 0 };
    state.loyaltyCards.push(card);
  }

  card.totalStampsEver += 1;
  const nextCurrentStamps = card.currentStamps + 1;
  const rewardUnlocked = nextCurrentStamps >= business.stampsRequired;
  card.currentStamps = rewardUnlocked ? 0 : nextCurrentStamps;

  persist();

  return {
    transaction,
    rewardUnlocked,
    reward: rewardUnlocked ? { description: business.rewardDescription } : null,
    card,
  };
};
