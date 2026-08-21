import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCustomerCardsRequest } from '../../lib/api';

function StampDots({ current, required }) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-label={`${current} of ${required} stamps`}>
      {Array.from({ length: required }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`h-3 w-3 rounded-full ${index < current ? 'bg-amber-500' : 'bg-neutral-800'}`}
        />
      ))}
    </div>
  );
}

function MyCards() {
  const { token } = useAuth();
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    getCustomerCardsRequest(token)
      .then((result) => {
        if (active) setCards(result.cards);
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
      <h1 className="text-2xl font-bold text-white">My cards</h1>
      {isLoading && <p className="mt-4 text-neutral-500">Loading loyalty cards…</p>}
      {error && <p className="mt-4 text-red-400" role="alert">{error}</p>}
      {!isLoading && !error && cards.length === 0 && (
        <p className="mt-4 text-neutral-500">
          No loyalty cards yet — buy something from a business in Discover to start collecting stamps.
        </p>
      )}
      {!isLoading && !error && cards.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <article key={card.id} className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-5">
              <h2 className="font-semibold text-white">{card.business.name}</h2>
              <p className="text-sm text-neutral-500">{card.business.category}</p>
              <div className="mt-4">
                <StampDots current={card.currentStamps} required={card.business.stampsRequired} />
                <p className="mt-2 text-sm text-neutral-400">
                  {card.currentStamps}/{card.business.stampsRequired} stamps — {card.totalStampsEver} total earned
                </p>
              </div>
              <p className="mt-3 text-sm text-neutral-400">Reward: {card.business.rewardDescription}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyCards;
