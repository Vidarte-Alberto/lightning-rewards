const PROBLEMS = [
  {
    number: '01',
    title: 'Extra steps',
    description: 'Scan another QR, open another app, or remember another card.',
  },
  {
    number: '02',
    title: 'Manual mistakes',
    description: 'Staff must remember to award points after every purchase.',
  },
  {
    number: '03',
    title: 'Disconnected data',
    description: 'Payment truth and loyalty progress live in separate systems.',
  },
];

function Problem() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-16">
      <p className="text-center text-xs font-extrabold tracking-[0.22em] text-accent uppercase">The problem</p>
      <h2 className="mt-4 text-3xl font-bold text-neutral-50 text-center">
        Loyalty programs add friction exactly where speed matters
      </h2>
      <p className="mt-4 text-neutral-400 text-center max-w-2xl mx-auto">
        Traditional programs force customers and merchants into a second workflow
        after payment.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {PROBLEMS.map((problem) => (
          <div
            key={problem.title}
            className="min-h-48 rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-6 shadow-[inset_0_1px_rgba(255,255,255,0.04)]"
          >
            <span className="text-xs font-extrabold tracking-[0.18em] text-accent">{problem.number}</span>
            <h3 className="mt-4 font-semibold text-neutral-50">{problem.title}</h3>
            <p className="mt-2 text-sm text-neutral-400">{problem.description}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 text-center text-lg font-medium text-accent-soft">
        The payment should be the loyalty action.
      </p>
    </section>
  );
}

export default Problem;
