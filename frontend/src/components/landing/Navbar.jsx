import { Link } from 'react-router-dom';
import Brand from '../Brand';

function Navbar() {
  return (
    <header className="border-b border-white/10">
      <nav className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
        <Brand />
        <div className="hidden sm:flex items-center gap-6 text-sm text-neutral-400">
          <a href="#how-it-works" className="hover:text-accent-soft">How it works</a>
          <a href="#benefits" className="hover:text-accent-soft">Benefits</a>
          <Link to="/presentation" className="text-accent-soft hover:brightness-110">Presentation</Link>
        </div>
        <Link
          to="/login"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/16 bg-white/4 px-5 text-sm font-extrabold text-neutral-100 transition-transform hover:-translate-y-0.5 hover:border-accent/50 hover:text-accent-soft"
        >
          Log in
        </Link>
      </nav>
    </header>
  );
}

export default Navbar;
