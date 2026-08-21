import { Link } from 'react-router-dom';

function Hero() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-20 text-center">
      <h1 className="text-4xl sm:text-5xl font-bold text-neutral-50 leading-tight">
        Every payment becomes a reason to return.
      </h1>
      <p className="mt-4 text-lg text-neutral-400 max-w-2xl mx-auto">
        Lightning Rewards turns confirmed Bitcoin payments into automatic loyalty
        stamps — no cards, no QR punch systems, no manual steps at checkout.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          to="/register?role=business"
          className="inline-flex min-h-13 items-center justify-center rounded-full bg-accent px-6 text-sm font-extrabold text-neutral-900 transition-transform hover:-translate-y-0.5"
        >
          {"I'm a business"}
        </Link>
        <Link
          to="/register?role=customer"
          className="inline-flex min-h-13 items-center justify-center rounded-full border border-white/16 bg-white/4 px-6 text-sm font-extrabold text-neutral-100 transition-transform hover:-translate-y-0.5 hover:border-accent/50 hover:text-accent-soft"
        >
          {"I'm a customer"}
        </Link>
        <Link
          to="/presentation"
          className="inline-flex min-h-13 items-center justify-center rounded-full px-6 text-sm font-extrabold text-accent-soft transition-colors hover:bg-accent/10"
        >
          View hackathon presentation
        </Link>
      </div>
    </section>
  );
}

export default Hero;
