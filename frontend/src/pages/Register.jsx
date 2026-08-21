import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { homeForRole, useAuth } from '../context/AuthContext';
import FormField from '../components/FormField';

const VALID_ROLES = ['business', 'customer'];

function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedRole = searchParams.get('role');

  const [role, setRole] = useState(
    VALID_ROLES.includes(preselectedRole) ? preselectedRole.toUpperCase() : 'CUSTOMER',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [nofferString, setNofferString] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const registeredUser = await register({ role, email, password, name, category, nofferString, rewardDescription });
      navigate(homeForRole(registeredUser.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-10 bg-neutral-950 bg-[radial-gradient(circle_at_50%_0%,rgba(245,165,36,0.08),transparent_28rem)]">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold text-white text-center">Sign up</h1>

        <div className="flex rounded-lg border border-neutral-700 p-1">
          {VALID_ROLES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRole(option.toUpperCase())}
              className={`flex-1 rounded-md py-2 text-sm font-medium capitalize transition-colors ${
                role === option.toUpperCase() ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <FormField id="email" label="Email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <FormField id="password" label="Password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />

        {role === 'BUSINESS' && (
          <>
            <FormField id="name" label="Business name" required value={name} onChange={(event) => setName(event.target.value)} />
            <FormField
              id="category"
              label="Category"
              required
              placeholder="Coffee shop, restaurant, shop…"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
            <FormField
              id="nofferString"
              label="Noffer string"
              required
              pattern="noffer1.*"
              placeholder="noffer1…"
              value={nofferString}
              onChange={(event) => setNofferString(event.target.value)}
            />
            <FormField
              id="rewardDescription"
              label="Reward description"
              required
              placeholder="A free coffee"
              value={rewardDescription}
              onChange={(event) => setRewardDescription(event.target.value)}
            />
          </>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 rounded-lg bg-amber-500 text-neutral-950 font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Signing up…' : 'Sign up'}
        </button>

        <p className="text-sm text-neutral-400 text-center">
          Already have an account? <Link to="/login" className="text-amber-400 underline underline-offset-4 hover:text-amber-300">Log in</Link>
        </p>
        <Link to="/" className="block text-sm text-neutral-500 text-center underline underline-offset-4 hover:text-neutral-300">
          Back to home
        </Link>
      </form>
    </div>
  );
}

export default Register;
