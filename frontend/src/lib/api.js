const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

const responseMessage = (body, fallback) => {
  if (typeof body?.error === 'string') return body.error;
  if (typeof body?.error?.message === 'string') return body.error.message;
  if (typeof body?.message === 'string') return body.message;
  return fallback;
};

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const apiRequest = async (path, { token, body, ...options } = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new ApiError('The server returned an invalid response.', response.status);
    }
  }

  if (!response.ok) {
    throw new ApiError(
      responseMessage(data, 'Unable to complete the request.'),
      response.status,
      data?.error?.code,
    );
  }

  return data;
};

export const loginRequest = (credentials) =>
  apiRequest('/auth/login', { method: 'POST', body: credentials });

export const registerRequest = (input) =>
  apiRequest('/auth/register', { method: 'POST', body: input });

export const updateCustomerWalletRequest = (ndebitString, token) =>
  apiRequest('/customers/me', {
    method: 'PATCH',
    token,
    body: { ndebitString },
  });

export const getOwnedBusinessRequest = (token) =>
  apiRequest('/businesses/me', { token });

export const updateOwnedBusinessRequest = (settings, token) =>
  apiRequest('/businesses/me', {
    method: 'PATCH',
    token,
    body: settings,
  });

export const getOwnedBusinessCustomersRequest = (token) =>
  apiRequest('/businesses/me/customers', { token });

export const getOwnedBusinessTransactionsRequest = (token) =>
  apiRequest('/businesses/me/transactions', { token });

export const checkOwnedBusinessOfferRequest = (token) =>
  apiRequest('/businesses/me/offer-test', { method: 'POST', token });

export const getCustomerBusinessesRequest = (token) =>
  apiRequest('/customers/me/businesses', { token });

export const getCustomerCardsRequest = (token) =>
  apiRequest('/customers/me/cards', { token });

export const getBusinessRequest = (businessId) =>
  apiRequest(`/businesses/${encodeURIComponent(businessId)}`);

export const createPurchaseRequest = (purchase, token) =>
  apiRequest('/payments/purchase', {
    method: 'POST',
    token,
    body: purchase,
  });
