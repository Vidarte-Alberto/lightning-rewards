import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import FormField from '../../components/FormField';

function Wallet() {
  const { user, connectWallet } = useAuth();
  const [ndebitString, setNdebitString] = useState(user.ndebitString || '');
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);

    if (!ndebitString.startsWith('ndebit1')) {
      setStatus({ type: 'error', message: 'That doesn’t look like an ndebit string — it should start with "ndebit1".' });
      return;
    }

    setIsSubmitting(true);

    try {
      await connectWallet(ndebitString);
      setStatus({ type: 'success', message: 'Wallet connected.' });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-neutral-900">Wallet</h1>
      <p className="mt-2 text-neutral-600">
        Paste your wallet&apos;s <code>ndebit</code> string to pay businesses directly with Lightning.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormField
          id="ndebitString"
          label="Ndebit string"
          required
          placeholder="ndebit1…"
          value={ndebitString}
          onChange={(event) => setNdebitString(event.target.value)}
        />

        {status && (
          <p className={`text-sm ${status.type === 'error' ? 'text-red-600' : 'text-green-700'}`}>{status.message}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Connecting…' : user.ndebitString ? 'Update wallet' : 'Connect wallet'}
        </button>
      </form>

      {user.ndebitString && (
        <p className="mt-6 text-sm text-neutral-500 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          Tip: in ShockWallet, set up an auto-approval budget for Lightning Rewards
          (e.g. up to 20,000 sats/month). Otherwise every purchase will need your manual
          approval in the wallet.
        </p>
      )}
    </div>
  );
}

export default Wallet;
