import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  checkOwnedBusinessOfferRequest,
  getOwnedBusinessRequest,
  updateOwnedBusinessRequest,
} from '../../lib/api';
import FormField from '../../components/FormField';

const OFFER_STATUS = {
  checking: {
    label: 'Checking offer…',
    className: 'border-neutral-300 bg-neutral-50 text-neutral-600',
  },
  available: {
    label: 'Offer available',
    className: 'border-green-200 bg-green-50 text-green-700',
  },
  unavailable: {
    label: 'Offer unavailable',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
};

function OfferStatus({ status, message }) {
  if (!status) return null;
  const presentation = OFFER_STATUS[status];

  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${presentation.className}`}>
      <span className="font-medium">{presentation.label}</span>
      {message && <span className="block mt-1">{message}</span>}
    </div>
  );
}

function Settings() {
  const { token } = useAuth();
  const [stampsRequired, setStampsRequired] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [nofferString, setNofferString] = useState('');
  const [savedNofferString, setSavedNofferString] = useState('');
  const [status, setStatus] = useState(null);
  const [offerStatus, setOfferStatus] = useState(null);
  const [offerMessage, setOfferMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checkOffer = useCallback(async () => {
    setOfferStatus('checking');
    setOfferMessage(null);

    try {
      const result = await checkOwnedBusinessOfferRequest(token);
      setOfferStatus(result.offerStatus.status);
      setOfferMessage(result.offerStatus.message ?? null);
    } catch (requestError) {
      setOfferStatus('unavailable');
      setOfferMessage(requestError.message);
    }
  }, [token]);

  useEffect(() => {
    let active = true;

    getOwnedBusinessRequest(token)
      .then(({ business }) => {
        if (!active) return;
        setStampsRequired(String(business.stampsRequired));
        setRewardDescription(business.rewardDescription);
        setNofferString(business.nofferString);
        setSavedNofferString(business.nofferString);
        void checkOffer();
      })
      .catch((requestError) => {
        if (active) setStatus({ type: 'error', message: requestError.message });
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [checkOffer, token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);

    const normalizedNoffer = nofferString.trim();
    if (!normalizedNoffer.startsWith('noffer1')) {
      setStatus({
        type: 'error',
        message: 'Paste a CLINK offer that starts with noffer1.',
      });
      setOfferStatus('unavailable');
      setOfferMessage('This is not a valid CLINK offer format.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateOwnedBusinessRequest({
        stampsRequired: Number(stampsRequired),
        rewardDescription,
        nofferString: normalizedNoffer,
      }, token);
      setStampsRequired(String(result.business.stampsRequired));
      setRewardDescription(result.business.rewardDescription);
      setNofferString(result.business.nofferString);
      setSavedNofferString(result.business.nofferString);
      setStatus({ type: 'success', message: 'Program updated.' });
      await checkOffer();
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>

      {isLoading ? (
        <p className="mt-6 text-neutral-500">Loading settings…</p>
      ) : (
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormField
          id="stampsRequired"
          label="Stamps required"
          type="number"
          min="1"
          required
          value={stampsRequired}
          onChange={(event) => setStampsRequired(event.target.value)}
        />
        <FormField
          id="rewardDescription"
          label="Reward description"
          required
          value={rewardDescription}
          onChange={(event) => setRewardDescription(event.target.value)}
        />
        <FormField
          id="nofferString"
          label="Lightning.Pub offer"
          required
          placeholder="noffer1…"
          value={nofferString}
          onChange={(event) => {
            setNofferString(event.target.value);
            setOfferStatus(null);
            setOfferMessage(null);
          }}
        />
        <p className="-mt-2 text-sm text-neutral-500">
          Paste your Lightning.Pub offer (starts with <code>noffer1…</code>).
        </p>

        <OfferStatus status={offerStatus} message={offerMessage} />

        {nofferString.trim() !== savedNofferString && (
          <p className="text-sm text-amber-700">
            Save your changes before checking the updated offer.
          </p>
        )}

        <button
          type="button"
          onClick={checkOffer}
          disabled={
            offerStatus === 'checking' ||
            isSubmitting ||
            nofferString.trim() !== savedNofferString
          }
          className="px-4 py-2 rounded-lg border border-neutral-300 text-sm font-medium text-neutral-900 hover:border-neutral-900 transition-colors disabled:opacity-50"
        >
          {offerStatus === 'checking' ? 'Checking…' : 'Check offer'}
        </button>

        {status && (
          <p className={`text-sm ${status.type === 'error' ? 'text-red-600' : 'text-green-700'}`}>{status.message}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </button>
      </form>
      )}
    </div>
  );
}

export default Settings;
