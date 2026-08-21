import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getOwnedBusinessTransactionsRequest } from '../../lib/api';

const STATUS_STYLES = {
  PAID: 'text-success',
  FAILED: 'text-danger',
  PENDING: 'text-neutral-500',
  UNKNOWN: 'text-accent-soft',
};

function Transactions() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getOwnedBusinessTransactionsRequest(token)
      .then((result) => {
        if (active) setTransactions(result.transactions);
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-50">Transactions</h1>

      {isLoading ? (
        <p className="mt-8 text-neutral-500">Loading transactions…</p>
      ) : error ? (
        <p className="mt-8 text-danger">{error}</p>
      ) : transactions.length === 0 ? (
        <p className="mt-8 text-neutral-500">No transactions yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-[1.25rem] border border-white/10 bg-white/[0.035] shadow-[inset_0_1px_rgba(255,255,255,0.04)]">
          <table className="min-w-2xl w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-neutral-500">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-white/6 last:border-0">
                  <td className="px-4 py-3 text-neutral-400">{new Date(transaction.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-neutral-400">{transaction.customer.email}</td>
                  <td className="px-4 py-3 text-neutral-400">{transaction.productName || 'Custom amount'}</td>
                  <td className="px-4 py-3 text-neutral-50">{transaction.amountSats} sats</td>
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
