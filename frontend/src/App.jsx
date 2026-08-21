import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import AppLayout from './components/AppLayout';
import RequireAuth from './components/RequireAuth';
import Discover from './pages/customer/Discover';
import MyCards from './pages/customer/MyCards';
import Wallet from './pages/customer/Wallet';
import Purchase from './pages/customer/Purchase';
import Dashboard from './pages/business/Dashboard';
import Settings from './pages/business/Settings';
import Transactions from './pages/business/Transactions';
import Presentation from './pages/Presentation';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/presentation" element={<Presentation />} />

      <Route
        element={
          <RequireAuth role="CUSTOMER">
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/customer/discover" element={<Discover />} />
        <Route path="/customer/cards" element={<MyCards />} />
        <Route path="/customer/wallet" element={<Wallet />} />
        <Route path="/customer/purchase/:businessId" element={<Purchase />} />
      </Route>

      <Route
        element={
          <RequireAuth role="BUSINESS">
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/business/dashboard" element={<Dashboard />} />
        <Route path="/business/settings" element={<Settings />} />
        <Route path="/business/transactions" element={<Transactions />} />
      </Route>
    </Routes>
  );
}

export default App;
