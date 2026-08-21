import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getBusinessByOwnerId, getBusinessTransactions } from '../../lib/mockStore';

const STATUS_STYLES = {
  PAID: 'text-green-700',
  FAILED: 'text-red-600',
  PENDING: 'text-neutral-500',
};

function Transactions() {
  const { user } = useAuth();
  const business = useMemo(() => getBusinessByOwnerId(user.id), [user.id]);
  const transactions = useMemo(() => getBusinessTransactions(business.id), [business.id]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Transactions</h1>

      {transactions.length === 0 ? (
        <p className="mt-8 text-neutral-500">No transactions yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 text-neutral-600">{new Date(transaction.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-neutral-900">{transaction.amountSats} sats</td>
                  <td className={`px-4 py-3 font-medium ${STATUS_STYLES[transaction.status]}`}>{transaction.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Transactions;
