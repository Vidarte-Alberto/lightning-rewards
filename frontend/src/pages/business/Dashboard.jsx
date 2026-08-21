import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getOwnedBusinessCustomersRequest,
  getOwnedBusinessRequest,
} from '../../lib/api';

function Dashboard() {
  const { token } = useAuth();
  const [business, setBusiness] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      getOwnedBusinessRequest(token),
      getOwnedBusinessCustomersRequest(token),
    ])
      .then(([businessResult, customersResult]) => {
        if (!active) return;
        setBusiness(businessResult.business);
        setCustomers(customersResult.customers);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  if (isLoading) {
    return <p className="text-neutral-500">Loading business dashboard…</p>;
  }

  if (error || !business) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-neutral-50">Business dashboard</h1>
        <p className="mt-4 text-danger">{error || 'Business profile not found.'}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-50">{business.name}</h1>
      <p className="text-neutral-400">{customers.length} customer{customers.length === 1 ? '' : 's'} enrolled</p>

      {customers.length === 0 ? (
        <p className="mt-8 text-neutral-500">No customers yet — once someone buys something, they&apos;ll show up here.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-[1.25rem] border border-white/10 bg-white/[0.035] shadow-[inset_0_1px_rgba(255,255,255,0.04)]">
          <table className="min-w-xl w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-neutral-500">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Total stamps ever</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((entry) => (
                <tr key={entry.id} className="border-b border-white/6 last:border-0">
                  <td className="px-4 py-3 text-neutral-50">{entry.customer.email}</td>
                  <td className="px-4 py-3 text-accent-soft">{entry.currentStamps}/{business.stampsRequired}</td>
                  <td className="px-4 py-3 text-neutral-400">{entry.totalStampsEver}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
