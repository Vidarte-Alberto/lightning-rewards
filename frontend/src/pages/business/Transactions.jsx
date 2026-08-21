import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getOwnedBusinessTransactionsRequest } from '../../lib/api';

const STATUS_STYLES = {
  PAID: 'text-green-400',
  FAILED: 'text-red-400',
  PENDING: 'text-neutral-500',
  UNKNOWN: 'text-amber-400',
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
      <h1 className="text-2xl font-bold text-white">Transactions</h1>

      {isLoading ? (
        <p className="mt-8 text-neutral-500">Loading transactions…</p>
      ) : error ? (
        <p className="mt-8 text-red-400">{error}</p>
      ) : transactions.length === 0 ? (
        <p className="mt-8 text-neutral-500">No transactions yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-900/60">
          <table className="min-w-[42rem] w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-500">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-neutral-800/60 last:border-0">
                  <td className="px-4 py-3 text-neutral-400">{new Date(transaction.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-neutral-400">{transaction.customer.email}</td>
                  <td className="px-4 py-3 text-white">{transaction.amountSats} sats</td>
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
