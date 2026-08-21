const SECTIONS = [
  {
    title: 'For businesses',
    items: [
      'Build repeat visits without any extra hardware or app for customers to install',
      'Get paid instantly over Lightning — no card fees, no chargebacks',
      'See every customer’s stamp progress from one dashboard',
      'Your noffer can receive payment requests — it can never spend your funds',
    ],
  },
  {
    title: 'For customers',
    items: [
      'No physical card to carry or lose',
      'Track your progress toward the reward at any business you visit',
      'Pay the way you already do with Lightning — the stamp just happens',
      'You control permission and budget — the app never sees your wallet seed',
    ],
  },
];

function Benefits() {
  return (
    <section id="benefits" className="max-w-5xl mx-auto px-6 py-16">
      <p className="text-center text-xs font-extrabold tracking-[0.22em] text-accent uppercase">Why it works</p>
      <h2 className="mt-4 text-3xl font-bold text-neutral-50 text-center">Benefits</h2>
      <div className="mt-10 grid gap-12 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h3 className="font-semibold text-neutral-50">{section.title}</h3>
            <ul className="mt-4 space-y-3">
              {section.items.map((item) => (
                <li key={item} className="flex gap-3 text-neutral-400">
                  <span className="text-accent" aria-hidden="true">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Benefits;
