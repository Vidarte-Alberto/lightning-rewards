const STEPS = [
  {
    title: 'Discover',
    description: 'Browse active local businesses and their rewards.',
  },
  {
    title: 'Connect',
    description: 'Paste a ShockWallet ndebit once — no seed phrase, no unrestricted access.',
  },
  {
    title: 'Pay',
    description: 'Approve manually or use a safe monthly budget for instant checkout.',
  },
  {
    title: 'Earn',
    description: 'See the stamp — and the reward, once unlocked — immediately.',
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-neutral-900/60 border-y border-neutral-800">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-white text-center">How it works</h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="text-center">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-500 text-neutral-950 font-semibold">
                {index + 1}
              </span>
              <h3 className="mt-4 font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm text-neutral-400">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default HowItWorks;
