import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function SlideHeading({ eyebrow, title, description }) {
  return (
    <div className="presentation-heading">
      <p className="presentation-kicker">{eyebrow}</p>
      <h2>{title}</h2>
      {description && <p className="presentation-lede">{description}</p>}
    </div>
  );
}

function IntroSlide({ onNext }) {
  return (
    <div className="presentation-intro">
      <p className="presentation-kicker">Lightning-native loyalty</p>
      <h1>Every payment becomes a reason to return.</h1>
      <p className="presentation-lede">
        Lightning Rewards turns confirmed Bitcoin payments into automatic loyalty
        stamps—without cards, QR punch systems, or manual steps at checkout.
      </p>
      <div className="presentation-intro-actions">
        <button type="button" className="presentation-primary-action" onClick={onNext}>
          Start presentation
        </button>
        <span>Use arrow keys, space, or swipe</span>
      </div>
      <div className="presentation-stamp-orbit" aria-hidden="true">
        <span className="presentation-bitcoin">₿</span>
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} className={`presentation-stamp presentation-stamp-${index + 1}`}>⚡</span>
        ))}
      </div>
    </div>
  );
}

function ProblemSlide() {
  return (
    <div>
      <SlideHeading
        eyebrow="The problem"
        title="Loyalty programs add friction exactly where speed matters."
        description="Traditional programs force customers and merchants into a second workflow after payment."
      />
      <div className="presentation-three-column">
        {[
          ['01', 'Extra steps', 'Scan another QR, open another app, or remember another card.'],
          ['02', 'Manual mistakes', 'Staff must remember to award points after every purchase.'],
          ['03', 'Disconnected data', 'Payment truth and loyalty progress live in separate systems.'],
        ].map(([number, title, copy]) => (
          <article className="presentation-card" key={number}>
            <span className="presentation-card-number">{number}</span>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>
      <p className="presentation-statement">The payment should be the loyalty action.</p>
    </div>
  );
}

function SolutionSlide() {
  const flow = [
    {
      label: 'Customer',
      title: 'Pays with Lightning',
      technology: 'ShockWallet · ndebit',
      detail: 'The customer approves a specific invoice. The app receives payment permission—not the wallet seed or unrestricted access to funds.',
      className: 'is-customer',
    },
    {
      label: 'Lightning Rewards',
      title: 'Orchestrates and verifies',
      technology: 'CLINK · Nostr · API',
      detail: 'The backend asks the merchant for an invoice, sends it to the customer wallet, and waits for an explicit payment result.',
      className: 'is-engine',
    },
    {
      label: 'Business',
      title: 'Gets paid + loyalty data',
      technology: 'Lightning.Pub · noffer',
      detail: 'The payment settles directly in the merchant wallet. The confirmed result becomes the source of truth for the loyalty stamp.',
      className: 'is-business',
    },
  ];
  const [activeNode, setActiveNode] = useState(1);

  return (
    <div>
      <SlideHeading
        eyebrow="The product"
        title="One confirmed payment. Three automatic outcomes."
      />
      <div className="presentation-solution-flow">
        {flow.map((node, index) => (
          <div className="presentation-flow-item" key={node.label}>
            <button
              type="button"
              className={`presentation-flow-node ${node.className} ${activeNode === index ? 'is-active' : ''}`}
              onClick={() => setActiveNode(index)}
              aria-pressed={activeNode === index}
            >
              <span>{node.label}</span>
              <strong>{node.title}</strong>
              <small>{node.technology}</small>
            </button>
            {index < flow.length - 1 && <span className="presentation-flow-arrow" aria-hidden="true">→</span>}
          </div>
        ))}
      </div>
      <div className="presentation-diagram-detail" aria-live="polite">
        <span>Selected actor</span>
        <strong>{flow[activeNode].label}</strong>
        <p>{flow[activeNode].detail}</p>
      </div>
      <div className="presentation-outcomes">
        <span>Payment settled</span>
        <span>Stamp granted</span>
        <span>Progress visible</span>
      </div>
    </div>
  );
}

function CustomerSlide() {
  const steps = [
    ['Discover', 'Browse active local businesses and rewards.'],
    ['Connect', 'Paste a ShockWallet ndebit once.'],
    ['Pay', 'Approve manually or use a safe monthly budget.'],
    ['Earn', 'See the stamp—and reward—immediately.'],
  ];

  return (
    <div>
      <SlideHeading
        eyebrow="Customer experience"
        title="From discovery to reward in four clear moments."
      />
      <div className="presentation-customer-layout">
        <ol className="presentation-journey">
          {steps.map(([title, copy], index) => (
            <li key={title}>
              <span>{index + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="presentation-loyalty-card">
          <div>
            <small>Lightning Coffee</small>
            <strong>4 of 5 stamps</strong>
          </div>
          <div className="presentation-mini-stamps" aria-label="Four of five stamps">
            {[true, true, true, true, false].map((filled, index) => (
              <span key={index} className={filled ? 'is-filled' : ''}>⚡</span>
            ))}
          </div>
          <p>Next purchase: a free house drink</p>
        </div>
      </div>
    </div>
  );
}

function BusinessSlide() {
  return (
    <div>
      <SlideHeading
        eyebrow="Business experience"
        title="The merchant configures the program. Payments do the rest."
      />
      <div className="presentation-business-grid">
        <article className="presentation-program-card">
          <span className="presentation-status-pill">Offer available</span>
          <small>Loyalty program</small>
          <h3>5 purchases</h3>
          <p>Reward: A free house drink</p>
          <div className="presentation-config-row"><span>CLINK offer</span><strong>noffer1…</strong></div>
        </article>
        <div className="presentation-metrics">
          <article><strong>24</strong><span>customers enrolled</span></article>
          <article><strong>147</strong><span>confirmed purchases</span></article>
          <article><strong>18</strong><span>rewards unlocked</span></article>
          <article><strong>0</strong><span>manual stamps</span></article>
        </div>
      </div>
    </div>
  );
}

function ArchitectureSlide() {
  const layers = [
    {
      title: 'React + Vite',
      copy: 'Role-based UI, wallet onboarding, and payment feedback.',
      detail: 'Customers discover businesses, connect their ndebit, approve purchases, and see stamps. Merchants configure their noffer and inspect activity.',
      output: 'Intent + clear payment status',
    },
    {
      title: 'Express + TypeScript',
      copy: 'Authentication, discovery, and payment orchestration.',
      detail: 'The API validates ownership, applies idempotency, coordinates CLINK requests, and translates protocol outcomes into explicit domain states.',
      output: 'A safe transaction state',
    },
    {
      title: 'Prisma + PostgreSQL',
      copy: 'Transactions, loyalty cards, rewards, and constraints.',
      detail: 'PostgreSQL stores the durable business truth. A database transaction records the paid purchase and grants exactly one stamp.',
      output: 'Auditable loyalty progress',
    },
  ];
  const [activeLayer, setActiveLayer] = useState(1);

  return (
    <div>
      <SlideHeading
        eyebrow="System architecture"
        title="A familiar web stack with an open Lightning payment rail."
      />
      <div className="presentation-architecture">
        <div className="presentation-stack">
          {layers.map((layer, index) => (
            <button
              type="button"
              key={layer.title}
              className={activeLayer === index ? 'is-active' : ''}
              onClick={() => setActiveLayer(index)}
              aria-pressed={activeLayer === index}
            >
              <span>0{index + 1}</span>
              <div><h3>{layer.title}</h3><p>{layer.copy}</p></div>
            </button>
          ))}
        </div>
        <div className="presentation-architecture-bridge" aria-hidden="true">
          <span>CLINK SDK</span><i /><span>Nostr relays</span>
        </div>
        <div className="presentation-lightning-edge">
          <article><small>Receive</small><strong>Lightning.Pub</strong><span>noffer1…</span></article>
          <article><small>Pay</small><strong>ShockWallet</strong><span>ndebit1…</span></article>
        </div>
      </div>
      <div className="presentation-diagram-detail is-architecture" aria-live="polite">
        <span>{layers[activeLayer].title}</span>
        <p>{layers[activeLayer].detail}</p>
        <strong>Produces: {layers[activeLayer].output}</strong>
      </div>
    </div>
  );
}

function ClinkSlide() {
  const events = [
    {
      title: 'Purchase intent',
      actor: 'Customer → Lightning Rewards',
      message: 'Business ID, amount, and idempotency key',
      explanation: 'The customer chooses a business and amount. No invoice exists yet, so no funds can move at this point.',
      safety: 'The idempotency key prevents a repeated request from becoming a second purchase.',
    },
    {
      title: 'Noffer request',
      actor: 'Lightning Rewards → Lightning.Pub',
      message: 'Encrypted Nostr event · kind 21001',
      explanation: 'The merchant noffer identifies where invoice requests should go. Lightning.Pub validates the amount and asks its LND node to create a BOLT11 invoice.',
      safety: 'A noffer can receive payment requests, but it cannot spend merchant funds.',
    },
    {
      title: 'Invoice response',
      actor: 'Lightning.Pub → Lightning Rewards',
      message: 'BOLT11 invoice over Nostr',
      explanation: 'The merchant wallet returns a real invoice containing the amount, destination, expiry, and payment hash.',
      safety: 'Lightning Rewards checks that the response matches the original request before continuing.',
    },
    {
      title: 'Ndebit request',
      actor: 'Lightning Rewards → ShockWallet',
      message: 'Encrypted Nostr event · kind 21002',
      explanation: 'The customer ndebit identifies the wallet allowed to receive debit requests. ShockWallet shows the invoice for approval or evaluates the configured budget.',
      safety: 'The customer controls permission and budget. The app never receives a seed phrase or private wallet key.',
    },
    {
      title: 'Settlement result',
      actor: 'ShockWallet → Lightning Rewards',
      message: 'OK + preimage, rejected, or unknown',
      explanation: 'ShockWallet pays the merchant invoice over Lightning and returns the result through Nostr. The preimage proves settlement.',
      safety: 'Only confirmed settlement grants a stamp. A timeout becomes UNKNOWN and is never treated as success.',
    },
  ];
  const [activeEvent, setActiveEvent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return undefined;

    const timer = window.setTimeout(() => {
      setActiveEvent((current) => {
        const next = Math.min(current + 1, events.length - 1);
        if (next >= events.length - 1) {
          setIsPlaying(false);
        }
        return next;
      });
    }, 1250);

    return () => window.clearTimeout(timer);
  }, [activeEvent, events.length, isPlaying]);

  const playFlow = () => {
    setActiveEvent(0);
    setIsPlaying(true);
  };

  const selectedEvent = events[activeEvent];

  return (
    <div>
      <SlideHeading
        eyebrow="How CLINK works"
        title="Offers receive. Debits pay. Nostr connects them."
        description="Select a step—or run the flow—to see exactly what travels between the wallets and the app."
      />
      <div className="presentation-clink-lab">
        <div className="presentation-clink-toolbar">
          <div className="presentation-clink-actors" aria-label="CLINK participants">
            <span>ShockWallet</span><i>↔</i><strong>Lightning Rewards</strong><i>↔</i><span>Lightning.Pub</span>
          </div>
          <button type="button" onClick={playFlow} disabled={isPlaying}>
            {isPlaying ? 'Running flow…' : 'Run payment flow'}
          </button>
        </div>
        <ol className="presentation-protocol">
          {events.map((event, index) => (
            <li key={event.title} className={activeEvent === index ? 'is-active' : ''}>
              <button
                type="button"
                onClick={() => { setIsPlaying(false); setActiveEvent(index); }}
                aria-pressed={activeEvent === index}
              >
                <span className="presentation-protocol-number">{index + 1}</span>
                <span>{event.title}</span>
              </button>
            </li>
          ))}
        </ol>
        <span className="presentation-swipe-hint">Swipe the steps →</span>
        <article className="presentation-clink-detail" aria-live="polite">
          <header>
            <div><small>Active message</small><h3>{selectedEvent.title}</h3></div>
            <code>{selectedEvent.message}</code>
          </header>
          <p><strong>{selectedEvent.actor}</strong>{selectedEvent.explanation}</p>
          <div><span>Why it is safe</span><p>{selectedEvent.safety}</p></div>
        </article>
      </div>
      <div className="presentation-clink-glossary">
        <div><code>noffer</code><span>A public pointer used to request invoices from the merchant wallet.</span></div>
        <div><code>ndebit</code><span>A customer-controlled permission to send payment requests to a wallet.</span></div>
        <div><code>Nostr relay</code><span>The message transport. It carries encrypted requests—not the Lightning payment.</span></div>
      </div>
    </div>
  );
}

function ReliabilitySlide() {
  return (
    <div>
      <SlideHeading
        eyebrow="Correctness by design"
        title="A stamp is a consequence of payment truth—not a button click."
      />
      <div className="presentation-state-machine">
        <div className="presentation-state is-pending"><small>Transaction</small><strong>PENDING</strong></div>
        <span>CLINK result</span>
        <div className="presentation-state-branches">
          <div className="presentation-state is-paid"><strong>PAID</strong><small>Grant one stamp</small></div>
          <div className="presentation-state is-failed"><strong>FAILED</strong><small>No stamp</small></div>
          <div className="presentation-state is-unknown"><strong>UNKNOWN</strong><small>Do not retry blindly</small></div>
        </div>
      </div>
      <div className="presentation-guardrails">
        <article><strong>Idempotency</strong><span>One payment can grant at most one stamp.</span></article>
        <article><strong>Database constraints</strong><span>Invalid transaction states are rejected.</span></article>
        <article><strong>Explicit UX</strong><span>Denied, failed, and unknown are different outcomes.</span></article>
      </div>
    </div>
  );
}

function DemoSlide() {
  return (
    <div>
      <SlideHeading
        eyebrow="Live demo"
        title="Let’s watch one payment travel through the entire system."
      />
      <div className="presentation-demo-grid">
        <ol>
          {[
            'Verify the business noffer is available.',
            'Connect the customer ShockWallet ndebit.',
            'Discover Lightning Coffee and pay.',
            'Approve the CLINK request in ShockWallet.',
            'See the stamp and business transaction appear.',
          ].map((step, index) => (
            <li key={step}><span>{index + 1}</span>{step}</li>
          ))}
        </ol>
        <div className="presentation-demo-panel">
          <span className="presentation-live-dot">Live</span>
          <h3>Ready to leave the slides?</h3>
          <p>The same application powers both the presentation and the working demo.</p>
          <div>
            <Link to="/login" state={{ from: '/business/settings' }}>Business login</Link>
            <Link to="/login" state={{ from: '/customer/discover' }}>Customer login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClosingSlide() {
  return (
    <div className="presentation-closing">
      <p className="presentation-kicker">Lightning Rewards</p>
      <h2>Loyalty that happens at the speed of payment.</h2>
      <div className="presentation-closing-points">
        <span>Automatic for customers</span>
        <span>Measurable for businesses</span>
        <span>Open and Lightning-native</span>
      </div>
      <p className="presentation-closing-question">Questions?</p>
      <Link to="/" className="presentation-secondary-action">Explore the app</Link>
    </div>
  );
}

export const PRESENTATION_SLIDES = [
  { id: 'intro', title: 'Lightning Rewards', component: IntroSlide, notes: 'Open with the promise: the payment itself should create loyalty. No separate scan or staff action.' },
  { id: 'problem', title: 'The problem', component: ProblemSlide, notes: 'Frame traditional loyalty as a checkout-friction problem and a data-integrity problem.' },
  { id: 'solution', title: 'The product', component: SolutionSlide, notes: 'Explain the three outcomes of one payment: settlement, stamp, and visibility.' },
  { id: 'customer', title: 'Customer journey', component: CustomerSlide, notes: 'Walk through the customer experience. The debit is connected once; approval can be manual or budget-based.' },
  { id: 'business', title: 'Business journey', component: BusinessSlide, notes: 'The business defines the offer and reward, then observes customers and transactions.' },
  { id: 'architecture', title: 'Architecture', component: ArchitectureSlide, notes: 'Separate the conventional web stack from the CLINK payment edge. Emphasize that Postgres stores business truth.' },
  { id: 'clink', title: 'CLINK protocol', component: ClinkSlide, notes: 'Describe noffer and ndebit as permissioned Nostr pointers. We never custody funds or wallet seeds.' },
  { id: 'reliability', title: 'Reliability', component: ReliabilitySlide, notes: 'This is the technical credibility slide: explicit states, idempotency, and database constraints.' },
  { id: 'demo', title: 'Live demo', component: DemoSlide, notes: 'Switch to the real app and execute one end-to-end payment. Check the wallet before retrying an unknown result.' },
  { id: 'closing', title: 'Closing', component: ClosingSlide, notes: 'Close with the value for both sides and invite questions.' },
];
