import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <header className="border-b border-neutral-800">
      <nav className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
        <span className="font-semibold text-white">Lightning Rewards</span>
        <div className="hidden sm:flex items-center gap-6 text-sm text-neutral-400">
          <a href="#how-it-works" className="hover:text-amber-400">How it works</a>
          <a href="#benefits" className="hover:text-amber-400">Benefits</a>
          <Link to="/presentation" className="text-amber-400 hover:text-amber-300">Presentation</Link>
        </div>
        <Link
          to="/login"
          className="text-sm font-medium px-4 py-2 rounded-lg border border-neutral-700 text-white hover:border-amber-500 hover:text-amber-400 transition-colors"
        >
          Log in
        </Link>
      </nav>
    </header>
  );
}

export default Navbar;
