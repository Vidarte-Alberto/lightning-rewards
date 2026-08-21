import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCustomerBusinessesRequest } from '../../lib/api';

function BusinessCard({ business }) {
  return (
    <article className="flex flex-col gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-6 shadow-[inset_0_1px_rgba(255,255,255,0.04)]">
      <div>
        <h2 className="font-semibold text-neutral-50">{business.name}</h2>
        <p className="text-sm text-neutral-500">{business.category}</p>
      </div>
      {business.description && <p className="text-sm text-neutral-400">{business.description}</p>}
      <p className="text-sm text-neutral-400">Reward: {business.rewardDescription}</p>
      {business.myProgress ? (
        <p className="text-sm font-medium text-accent-soft">
          {business.myProgress.currentStamps}/{business.stampsRequired} stamps
        </p>
      ) : (
        <p className="text-sm text-neutral-600">No stamps yet</p>
      )}
      <Link
        to={`/customer/purchase/${business.id}`}
        className="mt-auto inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-4 text-sm font-extrabold text-neutral-900 transition-transform hover:-translate-y-0.5"
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
      <h1 className="text-2xl font-bold text-neutral-50">Discover</h1>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          aria-label="Search businesses"
          placeholder="Search businesses…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="flex-1 rounded-lg border border-white/10 bg-neutral-900 text-neutral-50 placeholder:text-neutral-600 px-3 py-2 focus:border-accent focus:outline-none"
        />
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-lg border border-white/10 bg-neutral-900 text-neutral-50 px-3 py-2 focus:border-accent focus:outline-none"
        >
          <option value="">All categories</option>
          {categories.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {isLoading && <p className="mt-8 text-neutral-500">Loading businesses…</p>}
      {error && <p className="mt-8 text-danger" role="alert">{error}</p>}
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
