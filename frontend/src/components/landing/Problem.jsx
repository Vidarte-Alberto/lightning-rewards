const PROBLEMS = [
  {
    title: 'Extra steps',
    description: 'Scan another QR, open another app, or remember another card.',
  },
  {
    title: 'Manual mistakes',
    description: 'Staff must remember to award points after every purchase.',
  },
  {
    title: 'Disconnected data',
    description: 'Payment truth and loyalty progress live in separate systems.',
  },
];

function Problem() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-16">
      <h2 className="text-3xl font-bold text-neutral-900 text-center">
        Loyalty programs add friction exactly where speed matters
      </h2>
      <p className="mt-4 text-neutral-600 text-center max-w-2xl mx-auto">
        Traditional programs force customers and merchants into a second workflow
        after payment.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {PROBLEMS.map((problem) => (
          <div key={problem.title} className="rounded-lg border border-neutral-200 p-5">
            <h3 className="font-semibold text-neutral-900">{problem.title}</h3>
            <p className="mt-2 text-sm text-neutral-600">{problem.description}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 text-center text-lg font-medium text-neutral-900">
        The payment should be the loyalty action.
      </p>
    </section>
  );
}

export default Problem;
