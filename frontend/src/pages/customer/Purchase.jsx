import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import FormField from '../../components/FormField';
import { useAuth } from '../../context/AuthContext';
import {
  createPurchaseRequest,
  getBusinessProductsRequest,
  getBusinessRequest,
} from '../../lib/api';

const newIdempotencyKey = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const productPriceLabel = (product) => {
  if (product.priceCurrency === 'MXN') {
    return new Intl.NumberFormat('en-MX', { style: 'currency', currency: 'MXN' })
      .format(product.priceMxnCents / 100);
  }
  return `${product.priceSats.toLocaleString()} sats`;
};

function Purchase() {
  const { businessId } = useParams();
  const { user, token } = useAuth();
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [purchaseMode, setPurchaseMode] = useState('custom');
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [amountSats, setAmountSats] = useState('1000');
  const [status, setStatus] = useState('loading');
  const [result, setResult] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [startsNewAttempt, setStartsNewAttempt] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([
      getBusinessRequest(businessId),
      getBusinessProductsRequest(businessId),
    ])
      .then(([businessResponse, productsResponse]) => {
        if (!active) return;
        setBusiness(businessResponse.business);
        setProducts(productsResponse.products);
        if (productsResponse.products.length > 0) {
          setPurchaseMode('product');
          setSelectedProductId(productsResponse.products[0].id);
        }
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
          ...(purchaseMode === 'product'
            ? { productId: selectedProductId }
            : { amountSats: Number(amountSats) }),
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
    return <p className="text-danger" role="alert">{loadError}</p>;
  }

  if (!user.ndebitString) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-neutral-50">Connect your wallet first</h1>
        <p className="mt-2 text-neutral-400">
          You need to connect a Lightning wallet before you can pay {business.name}.
        </p>
        <Link
          to="/customer/wallet"
          className="mt-6 inline-flex min-h-13 items-center justify-center rounded-full bg-accent px-6 text-sm font-extrabold text-neutral-900 transition-transform hover:-translate-y-0.5"
        >
          Connect wallet
        </Link>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="max-w-md py-16 text-center" role="status">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-accent" />
        <h1 className="mt-6 text-xl font-semibold text-neutral-50">Waiting for wallet approval…</h1>
        <p className="mt-2 text-neutral-400">
          Open ShockWallet and approve the Lightning Rewards payment request to continue.
        </p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="max-w-md py-16 text-center">
        <h1 className="text-2xl font-bold text-neutral-50">Payment confirmed</h1>
        <p className="mt-2 text-neutral-400">
          {result.transaction.productName
            ? `${result.transaction.productName} was paid successfully. `
            : 'Your payment was confirmed. '}
          You earned a stamp at {business.name}.
        </p>
        {result.loyalty?.rewardUnlocked && (
          <p className="mt-4 text-lg font-semibold text-accent-soft">
            🎉 Reward unlocked: {result.loyalty.reward.description}
          </p>
        )}
        {result.loyalty && !result.loyalty.rewardUnlocked && (
          <p className="mt-3 text-sm text-neutral-400">
            {result.loyalty.card.currentStamps}/{result.loyalty.stampsRequired} stamps collected
          </p>
        )}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            to="/customer/cards"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 text-sm font-extrabold text-neutral-900 transition-transform hover:-translate-y-0.5"
          >
            View my cards
          </Link>
          <Link
            to="/customer/discover"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/16 bg-white/4 px-6 text-sm font-extrabold text-neutral-100 transition-transform hover:-translate-y-0.5 hover:border-accent/50 hover:text-accent-soft"
          >
            Discover more
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'unconfirmed') {
    return (
      <div className="max-w-md py-16 text-center">
        <h1 className="text-2xl font-bold text-neutral-50">Payment not confirmed</h1>
        <p className="mt-2 text-neutral-400">
          We could not confirm the final payment status. Check your wallet before trying again.
        </p>
        <Link
          to="/customer/discover"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-white/16 bg-white/4 px-6 text-sm font-extrabold text-neutral-100 transition-transform hover:-translate-y-0.5 hover:border-accent/50 hover:text-accent-soft"
        >
          Back to Discover
        </Link>
      </div>
    );
  }

  if (status === 'failure') {
    const approvalDenied = paymentError?.code === 'CLINK_DEBIT_DENIED';

    return (
      <div className="max-w-md py-16 text-center">
        <h1 className="text-2xl font-bold text-neutral-50">
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
          className="mt-6 inline-flex min-h-13 items-center justify-center rounded-full bg-accent px-6 text-sm font-extrabold text-neutral-900 transition-transform hover:-translate-y-0.5"
        >
          {approvalDenied ? 'Try payment again' : 'Try again'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-neutral-50">Buy from {business.name}</h1>
      <p className="mt-2 text-neutral-400">
        {business.rewardDescription} every {business.stampsRequired} stamps.
      </p>

      <div className="mt-6 flex rounded-full border border-white/10 bg-white/[0.035] p-1" role="tablist" aria-label="Purchase type">
        {products.length > 0 && (
          <button
            type="button"
            role="tab"
            aria-selected={purchaseMode === 'product'}
            onClick={() => setPurchaseMode('product')}
            className={`min-h-10 flex-1 rounded-full px-4 py-2 text-sm font-extrabold transition-colors ${purchaseMode === 'product' ? 'bg-accent text-neutral-900' : 'text-neutral-400 hover:text-neutral-50'}`}
          >
            Products
          </button>
        )}
        <button
          type="button"
          role="tab"
          aria-selected={purchaseMode === 'custom'}
          onClick={() => setPurchaseMode('custom')}
          className={`min-h-10 flex-1 rounded-full px-4 py-2 text-sm font-extrabold transition-colors ${purchaseMode === 'custom' ? 'bg-accent text-neutral-900' : 'text-neutral-400 hover:text-neutral-50'}`}
        >
          Custom amount
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {purchaseMode === 'product' ? (
          <fieldset>
            <legend className="mb-3 text-sm font-medium text-neutral-300">Choose a product</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {products.map((product) => {
                const selected = selectedProductId === product.id;
                return (
                  <label key={product.id} className={`cursor-pointer rounded-[1.25rem] border p-4 shadow-[inset_0_1px_rgba(255,255,255,0.04)] transition-all ${selected ? 'border-accent/60 bg-accent/10' : 'border-white/10 bg-white/[0.035] hover:-translate-y-0.5 hover:border-white/20'}`}>
                    <input
                      type="radio"
                      name="product"
                      value={product.id}
                      checked={selected}
                      onChange={() => setSelectedProductId(product.id)}
                      className="sr-only"
                    />
                    <span className="block font-semibold text-neutral-50">{product.name}</span>
                    {product.description && <span className="mt-1 block text-sm text-neutral-400">{product.description}</span>}
                    <span className="mt-3 block font-bold text-accent-soft">{productPriceLabel(product)}</span>
                    {product.priceCurrency === 'MXN' && (
                      <span className="mt-1 block text-xs text-neutral-500">≈ {product.priceSats.toLocaleString()} sats; refreshed at checkout</span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : (
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
        )}
        <button
          type="submit"
          disabled={purchaseMode === 'product' && !selectedProductId}
          className="inline-flex min-h-13 w-full items-center justify-center rounded-full bg-accent px-6 text-sm font-extrabold text-neutral-900 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {purchaseMode === 'product' && selectedProductId
            ? `Pay ${productPriceLabel(products.find((product) => product.id === selectedProductId))}`
            : 'Pay with Lightning'}
        </button>
      </form>
    </div>
  );
}

export default Purchase;
