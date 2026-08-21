import { createContext, useContext, useState } from 'react';
import * as mockStore from '../lib/mockStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => mockStore.getSession());

  const value = {
    user,
    login: async (credentials) => {
      const loggedInUser = await mockStore.login(credentials);
      setUser(loggedInUser);
      return loggedInUser;
    },
    register: async (input) => {
      const registeredUser = await mockStore.register(input);
      setUser(registeredUser);
      return registeredUser;
    },
    logout: () => {
      mockStore.logout();
      setUser(null);
    },
    connectWallet: async (ndebitString) => {
      const updatedUser = await mockStore.connectWallet(user.id, ndebitString);
      setUser(updatedUser);
      return updatedUser;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
