import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listBusinesses } from '../../lib/mockStore';

function BusinessCard({ business }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5 flex flex-col gap-3">
      <div>
        <h3 className="font-semibold text-neutral-900">{business.name}</h3>
        <p className="text-sm text-neutral-500">{business.category}</p>
      </div>
      {business.description && <p className="text-sm text-neutral-600">{business.description}</p>}
      <p className="text-sm text-neutral-600">Reward: {business.rewardDescription}</p>
      {business.myProgress ? (
        <p className="text-sm text-neutral-900 font-medium">
          {business.myProgress.currentStamps}/{business.stampsRequired} stamps
        </p>
      ) : (
        <p className="text-sm text-neutral-400">No stamps yet</p>
      )}
      <Link
        to={`/customer/purchase/${business.id}`}
        className="mt-auto text-center px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 transition-colors"
      >
        Buy something
      </Link>
    </div>
  );
}

function Discover() {
  const { user } = useAuth();
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const businesses = useMemo(
    () => listBusinesses({ category: category || undefined, search, customerId: user.id }),
    [category, search, user.id],
  );
  const categories = useMemo(
    () => [...new Set(listBusinesses().map((business) => business.category))],
    [],
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Discover</h1>
      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search businesses…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:border-neutral-900"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:border-neutral-900"
        >
          <option value="">All categories</option>
          {categories.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {businesses.length === 0 ? (
        <p className="mt-8 text-neutral-500">No businesses match your search.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((business) => (
            <BusinessCard key={business.id} business={business} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Discover;
