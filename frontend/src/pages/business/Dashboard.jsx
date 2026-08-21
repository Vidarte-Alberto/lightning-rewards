import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getBusinessByOwnerId, getBusinessCustomers } from '../../lib/mockStore';

function Dashboard() {
  const { user } = useAuth();
  const business = useMemo(() => getBusinessByOwnerId(user.id), [user.id]);
  const customers = useMemo(() => getBusinessCustomers(business.id), [business.id]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">{business.name}</h1>
      <p className="text-neutral-600">{customers.length} customer{customers.length === 1 ? '' : 's'} enrolled</p>

      {customers.length === 0 ? (
        <p className="mt-8 text-neutral-500">No customers yet — once someone buys something, they&apos;ll show up here.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Total stamps ever</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((entry) => (
                <tr key={entry.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 text-neutral-900">{entry.customer.email}</td>
                  <td className="px-4 py-3 text-neutral-600">{entry.currentStamps}/{business.stampsRequired}</td>
                  <td className="px-4 py-3 text-neutral-600">{entry.totalStampsEver}</td>
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
