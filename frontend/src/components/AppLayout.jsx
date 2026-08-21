import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Brand from './Brand';

const CUSTOMER_LINKS = [
  { to: '/customer/discover', label: 'Discover' },
  { to: '/customer/cards', label: 'My cards' },
  { to: '/customer/wallet', label: 'Wallet' },
];

const BUSINESS_LINKS = [
  { to: '/business/dashboard', label: 'Dashboard' },
  { to: '/business/products', label: 'Products' },
  { to: '/business/transactions', label: 'Transactions' },
  { to: '/business/settings', label: 'Settings' },
];

function AppLayout() {
  const { user, logout } = useAuth();
  const links = user?.role === 'BUSINESS' ? BUSINESS_LINKS : CUSTOMER_LINKS;

  return (
    <div className="min-h-screen bg-ink bg-[radial-gradient(circle_at_88%_0%,rgba(245,165,36,0.08),transparent_28rem)]">
      <header className="border-b border-white/10 bg-ink/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <Brand />
            <div className="flex min-w-0 items-center gap-3 text-sm text-neutral-400">
              <span className="hidden max-w-56 truncate text-neutral-500 lg:inline" title={user?.email}>
                {user?.email}
              </span>
              <button
                type="button"
                onClick={logout}
                className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-white/16 bg-white/4 px-4 text-sm font-extrabold text-neutral-100 transition-transform hover:-translate-y-0.5 hover:border-accent/50 hover:text-accent-soft sm:px-5"
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
                  `whitespace-nowrap ${isActive ? 'font-medium text-accent-soft' : 'hover:text-neutral-50'}`
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
