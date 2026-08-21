import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCustomerCards } from '../../lib/mockStore';

function StampDots({ current, required }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: required }, (_, index) => (
        <span
          key={index}
          className={`w-3 h-3 rounded-full ${index < current ? 'bg-neutral-900' : 'bg-neutral-200'}`}
        />
      ))}
    </div>
  );
}

function MyCards() {
  const { user } = useAuth();
  const cards = useMemo(() => getCustomerCards(user.id), [user.id]);

  if (cards.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">My cards</h1>
        <p className="mt-4 text-neutral-500">
          No loyalty cards yet — buy something from a business in Discover to start collecting stamps.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">My cards</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <div key={card.id} className="rounded-lg border border-neutral-200 bg-white p-5">
            <h3 className="font-semibold text-neutral-900">{card.business.name}</h3>
            <p className="text-sm text-neutral-500">{card.business.category}</p>
            <div className="mt-4">
              <StampDots current={card.currentStamps} required={card.business.stampsRequired} />
              <p className="mt-2 text-sm text-neutral-600">
                {card.currentStamps}/{card.business.stampsRequired} stamps — {card.totalStampsEver} total ever
              </p>
            </div>
            <p className="mt-3 text-sm text-neutral-600">Reward: {card.business.rewardDescription}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MyCards;
