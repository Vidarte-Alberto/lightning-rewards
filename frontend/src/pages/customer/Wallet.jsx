import { useEffect, useState } from 'react';
import FormField from '../../components/FormField';
import { useAuth } from '../../context/AuthContext';
import { getCustomerClinkSetupRequest } from '../../lib/api';

function ApprovalSetup({ setup, error }) {
  const [copyStatus, setCopyStatus] = useState(null);

  const copyIdentity = async () => {
    try {
      await navigator.clipboard.writeText(setup.identity.npub);
      setCopyStatus('App identity copied.');
    } catch {
      setCopyStatus('Copy the app identity manually from the field.');
    }
  };

  return (
    <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5" aria-labelledby="approval-setup-title">
      <h2 id="approval-setup-title" className="font-semibold text-neutral-900">
        Finish setup in ShockWallet
      </h2>
      <p className="mt-2 text-sm text-neutral-700">
        Your first payment request will ask you to link Lightning Rewards. Verify the app
        identity below, then set an auto-approval budget so future purchases can complete instantly.
      </p>
      {setup ? (
        <>
          <p className="mt-3 text-sm font-medium text-neutral-900">
            Recommended budget: {setup.recommendedBudget.amountSats.toLocaleString()} sats/month
          </p>
          <label htmlFor="platformNpub" className="mt-4 block text-sm font-medium text-neutral-700">
            Lightning Rewards app identity
          </label>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
            <input
              id="platformNpub"
              readOnly
              value={setup.identity.npub}
              className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-xs text-neutral-700"
            />
            <button
              type="button"
              onClick={copyIdentity}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:border-neutral-900"
            >
              Copy
            </button>
          </div>
          <details className="mt-3 text-xs text-neutral-600">
            <summary className="cursor-pointer">Show hex pubkey</summary>
            <code className="mt-1 block break-all">{setup.identity.publicKeyHex}</code>
          </details>
          {copyStatus && <p className="mt-2 text-xs text-neutral-600" role="status">{copyStatus}</p>}
        </>
      ) : (
        <p className={`mt-3 text-sm ${error ? 'text-red-600' : 'text-neutral-500'}`}>
          {error ?? 'Loading app identity…'}
        </p>
      )}
      <p className="mt-3 text-xs text-neutral-600">
        This budget is optional. Without it, approve every purchase manually in ShockWallet.
      </p>
    </section>
  );
}

function Wallet() {
  const { user, token, connectWallet } = useAuth();
  const [ndebitString, setNdebitString] = useState(user.ndebitString || '');
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clinkSetup, setClinkSetup] = useState(null);
  const [setupError, setSetupError] = useState(null);

  useEffect(() => {
    let active = true;

    getCustomerClinkSetupRequest(token)
      .then((result) => {
        if (active) setClinkSetup(result.clinkSetup);
      })
      .catch((requestError) => {
        if (active) setSetupError(requestError.message);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);
    const normalizedNdebit = ndebitString.trim();

    if (!normalizedNdebit.startsWith('ndebit1')) {
      setStatus({ type: 'error', message: 'That doesn’t look like an ndebit string — it should start with "ndebit1".' });
      return;
    }

    setIsSubmitting(true);

    try {
      await connectWallet(normalizedNdebit);
      setNdebitString(normalizedNdebit);
      setStatus({ type: 'success', message: 'Wallet connected. Complete the approval setup below.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-neutral-900">Wallet</h1>
      <p className="mt-2 text-neutral-600">
        Paste the CLINK <code>ndebit</code> from ShockWallet to authorize Lightning payments.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormField
          id="ndebitString"
          label="ShockWallet ndebit"
          required
          placeholder="ndebit1…"
          value={ndebitString}
          onChange={(event) => setNdebitString(event.target.value)}
        />

        {status && (
          <p className={`text-sm ${status.type === 'error' ? 'text-red-600' : 'text-green-700'}`} role="status">
            {status.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-neutral-900 px-6 py-3 font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Connecting…' : user.ndebitString ? 'Update wallet' : 'Connect wallet'}
        </button>
      </form>

      {user.ndebitString && <ApprovalSetup setup={clinkSetup} error={setupError} />}
    </div>
  );
}

export default Wallet;
