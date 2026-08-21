const STEPS = [
  {
    title: 'Pay with Lightning',
    description: 'Customer pays at checkout using their Lightning wallet — no cash, no card.',
  },
  {
    title: 'Stamp added automatically',
    description: 'Once the payment is confirmed, a stamp is added to their loyalty card. No manual step.',
  },
  {
    title: 'Collect 5 stamps',
    description: 'Every confirmed purchase counts toward the reward.',
  },
  {
    title: 'Unlock the reward',
    description: 'At 5 stamps, the reward unlocks and the count resets for the next round.',
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-neutral-50 border-y border-neutral-200">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-neutral-900 text-center">How it works</h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="text-center">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-neutral-900 text-white font-semibold">
                {index + 1}
              </span>
              <h3 className="mt-4 font-semibold text-neutral-900">{step.title}</h3>
              <p className="mt-2 text-sm text-neutral-600">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default HowItWorks;
