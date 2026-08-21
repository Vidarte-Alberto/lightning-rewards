import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCustomerBusinessesRequest } from '../../lib/api';

function BusinessCard({ business }) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-5">
      <div>
        <h2 className="font-semibold text-white">{business.name}</h2>
        <p className="text-sm text-neutral-500">{business.category}</p>
      </div>
      {business.description && <p className="text-sm text-neutral-400">{business.description}</p>}
      <p className="text-sm text-neutral-400">Reward: {business.rewardDescription}</p>
      {business.myProgress ? (
        <p className="text-sm font-medium text-amber-400">
          {business.myProgress.currentStamps}/{business.stampsRequired} stamps
        </p>
      ) : (
        <p className="text-sm text-neutral-600">No stamps yet</p>
      )}
      <Link
        to={`/customer/purchase/${business.id}`}
        className="mt-auto rounded-lg bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-400"
      >
        Buy something
      </Link>
    </article>
  );
}

function Discover() {
  const { token } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    getCustomerBusinessesRequest(token)
      .then((result) => {
        if (active) setBusinesses(result.businesses);
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

  const categories = useMemo(
    () => [...new Set(businesses.map((business) => business.category))].sort(),
    [businesses],
  );
  const visibleBusinesses = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return businesses.filter((business) => {
      const matchesCategory = !category || business.category === category;
      const matchesSearch =
        !query ||
        [business.name, business.category, business.description]
          .filter(Boolean)
          .some((value) => value.toLocaleLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [businesses, category, search]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Discover</h1>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          aria-label="Search businesses"
          placeholder="Search businesses…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 text-white placeholder:text-neutral-600 px-3 py-2 focus:border-amber-500 focus:outline-none"
        />
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-900 text-white px-3 py-2 focus:border-amber-500 focus:outline-none"
        >
          <option value="">All categories</option>
          {categories.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {isLoading && <p className="mt-8 text-neutral-500">Loading businesses…</p>}
      {error && <p className="mt-8 text-red-400" role="alert">{error}</p>}
      {!isLoading && !error && visibleBusinesses.length === 0 && (
        <p className="mt-8 text-neutral-500">No businesses match your search.</p>
      )}
      {!isLoading && !error && visibleBusinesses.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleBusinesses.map((business) => (
            <BusinessCard key={business.id} business={business} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Discover;
