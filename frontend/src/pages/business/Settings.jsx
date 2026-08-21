import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getOwnedBusinessRequest, updateOwnedBusinessRequest } from '../../lib/api';
import FormField from '../../components/FormField';

function Settings() {
  const { token } = useAuth();
  const [stampsRequired, setStampsRequired] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [nofferString, setNofferString] = useState('');
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    getOwnedBusinessRequest(token)
      .then(({ business }) => {
        if (!active) return;
        setStampsRequired(String(business.stampsRequired));
        setRewardDescription(business.rewardDescription);
        setNofferString(business.nofferString);
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
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      const result = await updateOwnedBusinessRequest({
        stampsRequired: Number(stampsRequired),
        rewardDescription,
        nofferString,
      }, token);
      setStampsRequired(String(result.business.stampsRequired));
      setRewardDescription(result.business.rewardDescription);
      setNofferString(result.business.nofferString);
      setStatus({ type: 'success', message: 'Program updated.' });
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
          label="Noffer string"
          required
          value={nofferString}
          onChange={(event) => setNofferString(event.target.value)}
        />

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
