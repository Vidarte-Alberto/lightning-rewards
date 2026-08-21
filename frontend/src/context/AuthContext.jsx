import { createContext, useContext, useMemo, useState } from 'react';
import {
  loginRequest,
  registerRequest,
  updateCustomerWalletRequest,
} from '../lib/api';

const SESSION_KEY = 'lightning-rewards-session';
const VALID_ROLES = new Set(['BUSINESS', 'CUSTOMER']);
const AuthContext = createContext(null);

const tokenIsCurrent = (token) => {
  try {
    const encodedPayload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=');
    const payload = JSON.parse(window.atob(paddedPayload));
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

const validSession = (session) =>
  typeof session?.token === 'string' &&
  tokenIsCurrent(session.token) &&
  typeof session?.user?.id === 'string' &&
  typeof session.user.email === 'string' &&
  VALID_ROLES.has(session.user.role);

const loadSession = () => {
  try {
    const session = JSON.parse(window.localStorage.getItem(SESSION_KEY));
    if (validSession(session)) return session;
  } catch {
    // Invalid or unavailable local storage is treated as a signed-out session.
  }

  window.localStorage.removeItem(SESSION_KEY);
  return null;
};

const storeSession = (session) => {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const homeForRole = (role) =>
  role === 'BUSINESS' ? '/business/dashboard' : '/customer/discover';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession);

  const saveSession = (nextSession) => {
    storeSession(nextSession);
    setSession(nextSession);
    return nextSession.user;
  };

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      login: async (credentials) => {
        const result = await loginRequest(credentials);
        return saveSession({ token: result.token, user: result.user });
      },
      register: async (input) => {
        await registerRequest(input);
        const result = await loginRequest({ email: input.email, password: input.password });
        return saveSession({ token: result.token, user: result.user });
      },
      logout: () => {
        window.localStorage.removeItem(SESSION_KEY);
        setSession(null);
      },
      connectWallet: async (ndebitString) => {
        if (!session) throw new Error('You must be logged in to connect a wallet.');
        const result = await updateCustomerWalletRequest(ndebitString, session.token);
        return saveSession({ ...session, user: result.user });
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
