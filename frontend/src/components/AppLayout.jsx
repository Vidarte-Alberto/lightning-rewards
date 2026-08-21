import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CUSTOMER_LINKS = [
  { to: '/customer/discover', label: 'Discover' },
  { to: '/customer/cards', label: 'My cards' },
  { to: '/customer/wallet', label: 'Wallet' },
];

const BUSINESS_LINKS = [
  { to: '/business/dashboard', label: 'Dashboard' },
  { to: '/business/transactions', label: 'Transactions' },
  { to: '/business/settings', label: 'Settings' },
];

function AppLayout() {
  const { user, logout } = useAuth();
  const links = user?.role === 'BUSINESS' ? BUSINESS_LINKS : CUSTOMER_LINKS;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <nav className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <span className="font-semibold text-neutral-900">Lightning Rewards</span>
          <div className="flex items-center gap-6 text-sm text-neutral-600">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => (isActive ? 'text-neutral-900 font-medium' : 'hover:text-neutral-900')}
              >
                {link.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={logout}
              className="text-sm font-medium px-4 py-2 rounded-lg border border-neutral-300 text-neutral-900 hover:border-neutral-900 transition-colors"
            >
              Log out
            </button>
          </div>
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
