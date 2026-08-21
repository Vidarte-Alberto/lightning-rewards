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
    <div className="min-h-screen bg-neutral-950 bg-[radial-gradient(circle_at_88%_0%,rgba(245,165,36,0.08),transparent_28rem)]">
      <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 font-semibold text-white">
              <span aria-hidden="true">🥇</span> Lightning Rewards
            </span>
            <div className="flex min-w-0 items-center gap-3 text-sm text-neutral-400">
              <span className="hidden max-w-56 truncate text-neutral-500 lg:inline" title={user?.email}>
                {user?.email}
              </span>
              <button
                type="button"
                onClick={logout}
                className="whitespace-nowrap rounded-lg border border-neutral-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:border-amber-500 hover:text-amber-400 sm:px-4"
              >
                Log out
              </button>
            </div>
          </div>
          <nav aria-label="Primary" className="mt-3 flex gap-5 overflow-x-auto pb-1 text-sm text-neutral-400 sm:mt-4 sm:gap-6">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `whitespace-nowrap ${isActive ? 'font-medium text-amber-400' : 'hover:text-white'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
