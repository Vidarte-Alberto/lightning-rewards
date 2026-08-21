import { Link } from 'react-router-dom';

function Hero() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-20 text-center">
      <h1 className="text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight">
        Every payment becomes a reason to return.
      </h1>
      <p className="mt-4 text-lg text-neutral-600 max-w-2xl mx-auto">
        Lightning Rewards turns confirmed Bitcoin payments into automatic loyalty
        stamps — no cards, no QR punch systems, no manual steps at checkout.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          to="/register?role=business"
          className="px-6 py-3 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-700 transition-colors"
        >
          {"I'm a business"}
        </Link>
        <Link
          to="/register?role=customer"
          className="px-6 py-3 rounded-lg border border-neutral-300 text-neutral-900 font-medium hover:border-neutral-900 transition-colors"
        >
          {"I'm a customer"}
        </Link>
        <Link
          to="/presentation"
          className="px-6 py-3 rounded-lg text-amber-700 font-medium hover:bg-amber-50 transition-colors"
        >
          View hackathon presentation
        </Link>
      </div>
    </section>
  );
}

export default Hero;
