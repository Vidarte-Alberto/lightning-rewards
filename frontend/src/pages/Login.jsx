import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { homeForRole, useAuth } from '../context/AuthContext';
import FormField from '../components/FormField';

function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      const loggedInUser = await login({ email, password });
      navigate(location.state?.from || homeForRole(loggedInUser.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-ink bg-[radial-gradient(circle_at_50%_0%,rgba(245,165,36,0.08),transparent_28rem)]">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold text-neutral-50 text-center">Log in</h1>

        <FormField id="email" label="Email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <FormField id="password" label="Password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-13 w-full items-center justify-center rounded-full bg-accent px-6 text-sm font-extrabold text-neutral-900 transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>

        <p className="text-sm text-neutral-400 text-center">
          No account? <Link to="/register" className="text-accent-soft underline underline-offset-4 hover:brightness-110">Sign up</Link>
        </p>
        <Link to="/" className="block text-sm text-neutral-500 text-center underline underline-offset-4 hover:text-neutral-300">
          Back to home
        </Link>
      </form>
    </div>
  );
}

export default Login;
