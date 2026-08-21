import { Link, useSearchParams } from 'react-router-dom';

const VALID_ROLES = ['business', 'customer'];

function Register() {
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role');
  const roleLabel = VALID_ROLES.includes(role) ? role : undefined;

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 text-center px-4">
      <h1 className="text-2xl font-semibold text-neutral-900">Sign up — Coming soon</h1>
      <p className="text-neutral-600">
        {roleLabel
          ? `We're still building sign up as a ${roleLabel}.`
          : "We're still building this screen."}
      </p>
      <Link to="/" className="text-neutral-900 underline underline-offset-4">
        Back to home
      </Link>
    </div>
  );
}

export default Register;
