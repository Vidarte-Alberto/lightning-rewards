import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getBusinessById, purchase } from '../../lib/mockStore';
import FormField from '../../components/FormField';

function Purchase() {
  const { businessId } = useParams();
  const { user } = useAuth();
  const business = getBusinessById(businessId);

  const [amountSats, setAmountSats] = useState('1000');
  const [status, setStatus] = useState('form');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!user.ndebitString) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-neutral-900">Connect your wallet first</h1>
        <p className="mt-2 text-neutral-600">
          You need to connect a Lightning wallet before you can pay {business.name}.
        </p>
        <Link
          to="/customer/wallet"
          className="mt-6 inline-block px-6 py-3 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-700 transition-colors"
        >
          Connect wallet
        </Link>
      </div>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setStatus('pending');

    try {
      const purchaseResult = await purchase({
        businessId,
        customerId: user.id,
        amountSats: Number(amountSats),
      });
      setResult(purchaseResult);
      setStatus(purchaseResult.transaction.status === 'PAID' ? 'success' : 'failure');
    } catch (err) {
      setError(err.message);
      setStatus('form');
    }
  };

  if (status === 'pending') {
    return (
      <div className="max-w-md text-center py-16">
        <div className="mx-auto w-12 h-12 rounded-full border-4 border-neutral-200 border-t-neutral-900 animate-spin" />
        <h1 className="mt-6 text-xl font-semibold text-neutral-900">Waiting for wallet approval…</h1>
        <p className="mt-2 text-neutral-600">Approve the payment in your Lightning wallet to continue.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="max-w-md text-center py-16">
        <h1 className="text-2xl font-bold text-neutral-900">Payment confirmed</h1>
        <p className="mt-2 text-neutral-600">You earned a stamp at {business.name}.</p>
        {result.rewardUnlocked && (
          <p className="mt-4 text-lg font-semibold text-neutral-900">
            🎉 Reward unlocked: {result.reward.description}
          </p>
        )}
        <div className="mt-6 flex justify-center gap-4">
          <Link to="/customer/cards" className="px-6 py-3 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-700 transition-colors">
            View my cards
          </Link>
          <Link to="/customer/discover" className="px-6 py-3 rounded-lg border border-neutral-300 text-neutral-900 font-medium hover:border-neutral-900 transition-colors">
            Discover more
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'failure') {
    return (
      <div className="max-w-md text-center py-16">
        <h1 className="text-2xl font-bold text-neutral-900">Payment failed</h1>
        <p className="mt-2 text-neutral-600">Your wallet declined the payment. No stamp was added.</p>
        <button
          type="button"
          onClick={() => setStatus('form')}
          className="mt-6 px-6 py-3 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-700 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-neutral-900">Buy from {business.name}</h1>
      <p className="mt-2 text-neutral-600">{business.rewardDescription} every {business.stampsRequired} stamps.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormField
          id="amountSats"
          label="Amount (sats)"
          type="number"
          min="1"
          required
          value={amountSats}
          onChange={(event) => setAmountSats(event.target.value)}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="w-full px-6 py-3 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-700 transition-colors"
        >
          Pay with Lightning
        </button>
      </form>
    </div>
  );
}

export default Purchase;
