import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCustomerCardsRequest } from '../../lib/api';

function StampRow({ current, required }) {
  return (
    <div className="grid grid-cols-5 gap-[0.55rem]" aria-label={`${current} of ${required} stamps`}>
      {Array.from({ length: required }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`grid aspect-square place-items-center rounded-full border text-lg ${
            index < current ? 'border-accent bg-accent text-neutral-900' : 'border-neutral-600 text-neutral-500'
          }`}
        >
          ⚡
        </span>
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
      <h1 className="text-2xl font-bold text-neutral-50">My cards</h1>
      {isLoading && <p className="mt-4 text-neutral-500">Loading loyalty cards…</p>}
      {error && <p className="mt-4 text-danger" role="alert">{error}</p>}
      {!isLoading && !error && cards.length === 0 && (
        <p className="mt-4 text-neutral-500">
          No loyalty cards yet — buy something from a business in Discover to start collecting stamps.
        </p>
      )}
      {!isLoading && !error && cards.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
      )}
    </div>
  );
}

export default MyCards;
