import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { findMockBusinessForUser, updateBusiness } from '../../lib/mockStore';
import FormField from '../../components/FormField';
import BackendDataPending from '../../components/BackendDataPending';

function Settings() {
  const { user } = useAuth();
  const business = findMockBusinessForUser(user);

  const [stampsRequired, setStampsRequired] = useState(business?.stampsRequired ?? 5);
  const [rewardDescription, setRewardDescription] = useState(business?.rewardDescription ?? '');
  const [nofferString, setNofferString] = useState(business?.nofferString ?? '');
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!business) {
    return <BackendDataPending title="Settings" />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      await updateBusiness(business.id, {
        stampsRequired: Number(stampsRequired),
        rewardDescription,
        nofferString,
      });
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
    </div>
  );
}

export default Settings;
