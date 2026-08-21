import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getCustomerCardsRequest,
  getCustomerRewardsRequest,
  redeemCustomerRewardRequest,
} from '../../lib/api';

function StampRow({ current, required }) {
  return (
    <div className="grid grid-cols-5 gap-[0.55rem]" aria-label={`${current} of ${required} stamps`}>
      {Array.from({ length: required }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`grid aspect-square place-items-center rounded-full border text-lg ${index < current ? 'border-accent bg-accent text-neutral-900' : 'border-neutral-600 text-neutral-500'
            }`}
        >
          ⚡
        </span>
      ))}
    </div>
  );
}

function RewardCard({ reward, confirming, isRedeeming, onCancel, onConfirm, onStart }) {
  const business = reward.transaction.business;

  return (
    <article className="rounded-[1.4rem] border border-accent/35 bg-accent/8 p-6 shadow-[inset_0_1px_rgba(255,255,255,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-soft">Reward ready</p>
          <h3 className="mt-2 text-lg font-bold text-neutral-50">{reward.description}</h3>
          <p className="mt-1 text-sm text-neutral-400">{business.name}</p>
        </div>
      </div>
      <p className="mt-5 text-xs text-neutral-500">
        Earned {new Date(reward.earnedAt).toLocaleDateString()}
      </p>

      {confirming ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-ink/50 p-4">
          <p className="text-sm text-neutral-300">
            Show this screen to the business. Redeem only when staff is ready to honor it.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isRedeeming}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-extrabold text-neutral-900 transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {isRedeeming ? 'Redeeming…' : 'Redeem now'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isRedeeming}
              className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-extrabold text-neutral-400 hover:text-neutral-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onStart}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 text-sm font-extrabold text-neutral-900 transition-transform hover:-translate-y-0.5"
        >
          Redeem reward
        </button>
      )}
    </article>
  );
}

function MyCards() {
  const { token } = useAuth();
  const [cards, setCards] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rewardError, setRewardError] = useState(null);
  const [confirmingRewardId, setConfirmingRewardId] = useState(null);
  const [redeemingRewardId, setRedeemingRewardId] = useState(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      getCustomerCardsRequest(token),
      getCustomerRewardsRequest(token),
    ])
      .then(([cardsResult, rewardsResult]) => {
        if (!active) return;
        setCards(cardsResult.cards);
        setRewards(rewardsResult.rewards);
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

  const redeemReward = async (rewardId) => {
    setRewardError(null);
    setRedeemingRewardId(rewardId);
    try {
      const { reward } = await redeemCustomerRewardRequest(rewardId, token);
      setRewards((current) => current.map((entry) => entry.id === reward.id ? reward : entry));
      setConfirmingRewardId(null);
    } catch (requestError) {
      setRewardError(requestError.message);
    } finally {
      setRedeemingRewardId(null);
    }
  };

  const availableRewards = rewards.filter((reward) => reward.status === 'AVAILABLE');
  const redeemedRewards = rewards.filter((reward) => reward.status === 'REDEEMED');

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-50">My cards</h1>
      {isLoading && <p className="mt-4 text-neutral-500">Loading loyalty cards…</p>}
      {error && <p className="mt-4 text-danger" role="alert">{error}</p>}
      {!isLoading && !error && cards.length === 0 && rewards.length === 0 && (
        <p className="mt-4 text-neutral-500">
          No loyalty cards yet — buy something from a business in Discover to start collecting stamps.
        </p>
      )}

      {!isLoading && !error && rewards.length > 0 && (
        <section className="mt-8" aria-labelledby="rewards-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="rewards-heading" className="text-lg font-bold text-neutral-50">Your rewards</h2>
              <p className="mt-1 text-sm text-neutral-500">Rewards stay here until you redeem them.</p>
            </div>
            <span className="rounded-full border border-accent/25 bg-accent/8 px-3 py-1 text-xs font-bold text-accent-soft">
              {availableRewards.length} available
            </span>
          </div>

          {rewardError && <p className="mt-4 text-danger" role="alert">{rewardError}</p>}

          {availableRewards.length > 0 && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {availableRewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  confirming={confirmingRewardId === reward.id}
                  isRedeeming={redeemingRewardId === reward.id}
                  onStart={() => setConfirmingRewardId(reward.id)}
                  onCancel={() => setConfirmingRewardId(null)}
                  onConfirm={() => redeemReward(reward.id)}
                />
              ))}
            </div>
          )}

          {redeemedRewards.length > 0 && (
            <div className="mt-6 rounded-[1.25rem] border border-white/10 bg-white/[0.025] p-5">
              <h3 className="text-sm font-bold text-neutral-300">Redemption history</h3>
              <ul className="mt-3 divide-y divide-white/8">
                {redeemedRewards.map((reward) => (
                  <li key={reward.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <div>
                      <p className="text-neutral-300">{reward.description}</p>
                      <p className="text-neutral-600">{reward.transaction.business.name}</p>
                    </div>
                    <span className="whitespace-nowrap text-success">
                      Redeemed {new Date(reward.redeemedAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {!isLoading && !error && cards.length > 0 && (
        <section className="mt-8" aria-labelledby="loyalty-cards-heading">
          <h2 id="loyalty-cards-heading" className="text-lg font-bold text-neutral-50">Loyalty cards</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {cards.map((card) => (
              <article
                key={card.id}
                className="rounded-[1.4rem] bg-linear-to-br from-neutral-800 to-[#141414] p-[1.6rem] shadow-[0_2rem_5rem_rgba(0,0,0,0.35)]"
              >
                <div className="mb-[1.4rem] flex items-center justify-between gap-4">
                  <h2 className="font-normal text-neutral-400">{card.business.name}</h2>
                  <strong className="text-neutral-50">{card.currentStamps} of {card.business.stampsRequired} stamps</strong>
                </div>
                <StampRow current={card.currentStamps} required={card.business.stampsRequired} />
                <p className="mt-5 text-sm text-neutral-400">Next purchase: {card.business.rewardDescription}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default MyCards;
