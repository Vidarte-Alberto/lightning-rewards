import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import FormField from '../../components/FormField';
import { useAuth } from '../../context/AuthContext';
import { createPurchaseRequest, getBusinessRequest } from '../../lib/api';

const newIdempotencyKey = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

function Purchase() {
  const { businessId } = useParams();
  const { user, token } = useAuth();
  const [business, setBusiness] = useState(null);
  const [amountSats, setAmountSats] = useState('1000');
  const [status, setStatus] = useState('loading');
  const [result, setResult] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [startsNewAttempt, setStartsNewAttempt] = useState(false);

  useEffect(() => {
    let active = true;

    getBusinessRequest(businessId)
      .then((response) => {
        if (!active) return;
        setBusiness(response.business);
        setStatus('form');
      })
      .catch((requestError) => {
        if (!active) return;
        setLoadError(requestError.message);
        setStatus('load-error');
      });

    return () => {
      active = false;
    };
  }, [businessId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setPaymentError(null);
    setStartsNewAttempt(false);
    setStatus('pending');

    try {
      const purchaseResult = await createPurchaseRequest(
        {
          businessId,
          amountSats: Number(amountSats),
          idempotencyKey,
        },
        token,
      );
      setResult(purchaseResult);
      setStatus(purchaseResult.outcome === 'paid' ? 'success' : 'unconfirmed');
    } catch (requestError) {
      setPaymentError(requestError);
      setStartsNewAttempt(
        typeof requestError.status === 'number' && requestError.status !== 500,
      );
      setStatus('failure');
    }
  };

  const retry = () => {
    if (startsNewAttempt) setIdempotencyKey(newIdempotencyKey());
    setStatus('form');
  };

  if (status === 'loading') {
    return <p className="text-neutral-500">Loading business…</p>;
  }

  if (status === 'load-error') {
    return <p className="text-red-400" role="alert">{loadError}</p>;
  }

  if (!user.ndebitString) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-white">Connect your wallet first</h1>
        <p className="mt-2 text-neutral-400">
          You need to connect a Lightning wallet before you can pay {business.name}.
        </p>
        <Link
          to="/customer/wallet"
          className="mt-6 inline-block rounded-lg bg-amber-500 px-6 py-3 font-semibold text-neutral-950 transition-colors hover:bg-amber-400"
        >
          Connect wallet
        </Link>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="max-w-md py-16 text-center" role="status">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-neutral-800 border-t-amber-500" />
        <h1 className="mt-6 text-xl font-semibold text-white">Waiting for wallet approval…</h1>
        <p className="mt-2 text-neutral-400">
          Open ShockWallet and approve the Lightning Rewards payment request to continue.
        </p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="max-w-md py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Payment confirmed</h1>
        <p className="mt-2 text-neutral-400">You earned a stamp at {business.name}.</p>
        {result.loyalty?.rewardUnlocked && (
          <p className="mt-4 text-lg font-semibold text-amber-400">
            🎉 Reward unlocked: {result.loyalty.reward.description}
          </p>
        )}
        {result.loyalty && !result.loyalty.rewardUnlocked && (
          <p className="mt-3 text-sm text-neutral-400">
            {result.loyalty.card.currentStamps}/{result.loyalty.stampsRequired} stamps collected
          </p>
        )}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
          <Link to="/customer/cards" className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-neutral-950 transition-colors hover:bg-amber-400">
            View my cards
          </Link>
          <Link to="/customer/discover" className="rounded-lg border border-neutral-700 px-6 py-3 font-medium text-white transition-colors hover:border-amber-500 hover:text-amber-400">
            Discover more
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'unconfirmed') {
    return (
      <div className="max-w-md py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Payment not confirmed</h1>
        <p className="mt-2 text-neutral-400">
          We could not confirm the final payment status. Check your wallet before trying again.
        </p>
        <Link to="/customer/discover" className="mt-6 inline-block rounded-lg border border-neutral-700 px-6 py-3 font-medium text-white hover:border-amber-500 hover:text-amber-400">
          Back to Discover
        </Link>
      </div>
    );
  }

  if (status === 'failure') {
    const approvalDenied = paymentError?.code === 'CLINK_DEBIT_DENIED';

    return (
      <div className="max-w-md py-16 text-center">
        <h1 className="text-2xl font-bold text-white">
          {approvalDenied ? 'Payment approval declined' : 'Payment failed'}
        </h1>
        <p className="mt-2 text-neutral-400" role="alert">
          {approvalDenied
            ? 'The payment was not approved. Open ShockWallet and approve the next request when you try again.'
            : paymentError?.message}
        </p>
        <p className="mt-2 text-sm text-neutral-500">No stamp was added.</p>
        <button
          type="button"
          onClick={retry}
          className="mt-6 rounded-lg bg-amber-500 px-6 py-3 font-semibold text-neutral-950 transition-colors hover:bg-amber-400"
        >
          {approvalDenied ? 'Try payment again' : 'Try again'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-white">Buy from {business.name}</h1>
      <p className="mt-2 text-neutral-400">
        {business.rewardDescription} every {business.stampsRequired} stamps.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormField
          id="amountSats"
          label="Amount (sats)"
          type="number"
          min="1"
          step="1"
          required
          value={amountSats}
          onChange={(event) => setAmountSats(event.target.value)}
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-amber-500 px-6 py-3 font-semibold text-neutral-950 transition-colors hover:bg-amber-400"
        >
          Pay with Lightning
        </button>
      </form>
    </div>
  );
}

export default Purchase;
