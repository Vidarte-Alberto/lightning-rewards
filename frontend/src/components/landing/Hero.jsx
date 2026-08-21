import { Link } from 'react-router-dom';

function Hero() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-20 text-center">
      <h1 className="text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight">
        Loyalty stamps, earned automatically with Lightning payments
      </h1>
      <p className="mt-4 text-lg text-neutral-600 max-w-2xl mx-auto">
        Every time a customer pays with Bitcoin Lightning at your business, they earn a
        stamp. No extra app, no physical card, no manual button.
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
      </div>
    </section>
  );
}

export default Hero;
