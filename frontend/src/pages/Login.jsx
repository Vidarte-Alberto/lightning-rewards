import { Link } from 'react-router-dom';

function Login() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 text-center px-4">
      <h1 className="text-2xl font-semibold text-neutral-900">Log in — Coming soon</h1>
      <p className="text-neutral-600">We&apos;re still building this screen.</p>
      <Link to="/" className="text-neutral-900 underline underline-offset-4">
        Back to home
      </Link>
    </div>
  );
}

export default Login;
