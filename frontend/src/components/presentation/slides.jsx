import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  EmbeddedWalletSlide,
  LoyaltySimulationSlide,
  MultiWalletArchitectureSlide,
  WalletOnboardingSlide,
} from './walletSlides';

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
        Lightning Rewards combines an embedded Lightning wallet with automatic loyalty
        stamps—so joining, paying, and earning all happen in one experience.
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
      title: 'Joins with a wallet',
      technology: 'Embedded or external',
      detail: 'A new customer gets a hosted Lightning.Pub account automatically, while an experienced user can connect an existing CLINK wallet.',
      className: 'is-customer',
    },
    {
      label: 'Lightning Rewards',
      title: 'Orchestrates and verifies',
      technology: 'CLINK · Nostr · Loyalty',
      detail: 'The app provisions accounts, coordinates payments, and turns a confirmed result into exactly one loyalty stamp.',
      className: 'is-engine',
    },
    {
      label: 'Business',
      title: 'Receives + retains',
      technology: 'Wallet · noffer · insights',
      detail: 'The merchant receives sats in an isolated account and sees loyalty progress without configuring a separate rewards system.',
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
    ['Create', 'Get an embedded wallet—or connect an existing one.'],
    ['Pay', 'Spend from the same interface with a clear confirmation.'],
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
  const [view, setView] = useState('program');

  return (
    <div>
      <SlideHeading
        eyebrow="Business experience"
        title="One dashboard for money, customers, and retention."
      />
      <div className="presentation-business-grid">
        <article className="presentation-program-card">
          <header><div><small>Lightning Coffee</small><h3>{view === 'wallet' ? '21,990 sats' : view === 'customers' ? '24 customers' : '5 purchases'}</h3></div><span className="presentation-status-pill">Wallet active</span></header>
          <div className="presentation-segmented">
            {['program', 'wallet', 'customers'].map((item) => <button type="button" key={item} className={view === item ? 'is-active' : ''} onClick={() => setView(item)}>{item}</button>)}
          </div>
          {view === 'program' && <><p>Reward: A free house drink</p><div className="presentation-config-row"><div><span>Rule</span><strong>5 stamps</strong></div><div><span>Offer</span><strong>noffer1…</strong></div><div><span>Status</span><strong>Live</strong></div></div></>}
          {view === 'wallet' && <><p>Hosted account on the shared Lightning.Pub.</p><div className="presentation-config-row"><div><span>Today</span><strong>+1,840</strong></div><div><span>Payments</span><strong>17</strong></div><div><span>Fees</span><strong>6 sats</strong></div></div></>}
          {view === 'customers' && <><p>People returning because payment automatically records progress.</p><div className="presentation-config-row"><div><span>Active</span><strong>18</strong></div><div><span>Rewards</span><strong>6</strong></div><div><span>Return rate</span><strong>42%</strong></div></div></>}
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
      copy: 'Role-based UI, embedded wallet, and payment feedback.',
      detail: 'Customers create or connect a wallet, receive and send sats, discover businesses, and see stamps. Merchants manage their wallet, program, and activity.',
      output: 'Intent + clear payment status',
    },
    {
      title: 'Express + TypeScript',
      copy: 'Authentication, wallet providers, and payment orchestration.',
      detail: 'The API encrypts hosted credentials, applies idempotency, coordinates CLINK and Lightning.Pub RPC, and translates outcomes into explicit domain states.',
      output: 'A safe transaction state',
    },
    {
      title: 'Prisma + PostgreSQL',
      copy: 'Wallet references, transactions, cards, and rewards.',
      detail: 'PostgreSQL stores app state and encrypted wallet references—not the shared Lightning ledger. A database transaction grants exactly one stamp.',
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
          <span>CLINK + RPC</span><i /><span>Nostr relays</span>
        </div>
        <div className="presentation-lightning-edge">
          <article><small>Hosted accounts</small><strong>Lightning.Pub</strong><span>One shared node</span></article>
          <article><small>Portable option</small><strong>External wallet</strong><span>noffer · ndebit</span></article>
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
      title: 'Enroll account',
      actor: 'Lightning Rewards → Lightning.Pub',
      message: 'Encrypted Nostr event · kind 21004',
      explanation: 'Nenroll binds a unique user identity to an isolated account and returns its noffer, ndebit, and nmanage pointers.',
      safety: 'Every user receives a distinct signing identity and account. No channels are opened per user.',
    },
    {
      title: 'Request invoice',
      actor: 'Lightning Rewards → Lightning.Pub',
      message: 'Encrypted Nostr event · kind 21001',
      explanation: 'The merchant noffer identifies where invoice requests should go. Lightning.Pub validates the amount and asks its LND node to create a BOLT11 invoice.',
      safety: 'A noffer can receive payment requests, but it cannot spend merchant funds.',
    },
    {
      title: 'Choose payer',
      actor: 'Wallet provider → Lightning Rewards',
      message: 'Embedded RPC or external ndebit',
      explanation: 'The same purchase service selects the active provider. Hosted accounts use Lightning.Pub RPC; connected wallets use their CLINK debit.',
      safety: 'Provider capabilities are explicit, keeping wallet-specific behavior outside loyalty logic.',
    },
    {
      title: 'Pay invoice',
      actor: 'Customer account → Business account',
      message: 'Lightning settlement · internal or routed',
      explanation: 'Lightning.Pub can settle between its own accounts or route over LND. An external wallet follows the normal Lightning path.',
      safety: 'A 10,000 sat application limit reduces risk during the hosted-wallet MVP.',
    },
    {
      title: 'Grant loyalty',
      actor: 'Payment truth → PostgreSQL',
      message: 'OK + preimage, rejected, or unknown',
      explanation: 'The verified payment result moves the transaction to PAID. Only then does the loyalty service grant the next stamp.',
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
        title="Enroll creates the account. Offers and debits keep it portable."
        description="Select a step—or run the flow—to see how hosted and external wallets share one loyalty payment contract."
      />
      <div className="presentation-clink-lab">
        <div className="presentation-clink-toolbar">
          <div className="presentation-clink-actors" aria-label="CLINK participants">
            <span>Any CLINK wallet</span><i>↔</i><strong>Lightning Rewards</strong><i>↔</i><span>Lightning.Pub</span>
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
        <div><code>Nenroll</code><span>Creates or recovers one account and its three CLINK pointers.</span></div>
        <div><code>noffer</code><span>A public pointer used to request invoices from the merchant wallet.</span></div>
        <div><code>ndebit</code><span>A customer-controlled permission to send payment requests to a wallet.</span></div>
        <div><code>Pub RPC</code><span>Provides hosted balance, invoices, payments, and account history over Nostr.</span></div>
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
        eyebrow="Hackathon demo strategy"
        title="A reliable product story—with a real core and a deterministic vision."
      />
      <div className="presentation-demo-grid">
        <ol>
          {[
            'Create a hosted account in the onboarding prototype.',
            'Receive and send from the interactive wallet surface.',
            'Run the customer-to-business purchase simulation.',
            'Explain one Pub serving many isolated accounts.',
            'Open the working loyalty app for the real CLINK core.',
          ].map((step, index) => (
            <li key={step}><span>{index + 1}</span>{step}</li>
          ))}
        </ol>
        <div className="presentation-demo-panel">
          <span className="presentation-live-dot">Hybrid demo</span>
          <h3>Vision without demo risk.</h3>
          <p>Wallet screens use transparent, deterministic mock data. Authentication, business discovery, CLINK payments, idempotency, and loyalty persistence remain grounded in the working application.</p>
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
  { id: 'wallet-onboarding', title: 'Wallet onboarding', component: WalletOnboardingSlide, notes: 'Run Create my wallet. Explain that one unique Nostr key calls Nenroll and receives noffer, ndebit, and nmanage without manual configuration.' },
  { id: 'embedded-wallet', title: 'Embedded wallet', component: EmbeddedWalletSlide, notes: 'Explore Overview, Receive, Send, and Activity. This is deterministic prototype data representing the Lightning.Pub RPC experience.' },
  { id: 'loyalty-simulation', title: 'Wallet purchase', component: LoyaltySimulationSlide, notes: 'Run the purchase and narrate invoice creation, hosted payment, settlement, and the atomic fifth stamp.' },
  { id: 'business', title: 'Business journey', component: BusinessSlide, notes: 'The business defines the offer and reward, then observes customers and transactions.' },
  { id: 'multi-wallet', title: 'One Pub, many wallets', component: MultiWalletArchitectureSlide, notes: 'Select accounts. Balances and identities are isolated, while LND channels and liquidity are shared.' },
  { id: 'architecture', title: 'Architecture', component: ArchitectureSlide, notes: 'Separate the conventional web stack from the CLINK payment edge. Emphasize that Postgres stores business truth.' },
  { id: 'clink', title: 'CLINK protocol', component: ClinkSlide, notes: 'Explain the split: CLINK Enroll and pointers provide portability; Lightning.Pub RPC provides the complete hosted-wallet interface.' },
  { id: 'reliability', title: 'Reliability', component: ReliabilitySlide, notes: 'This is the technical credibility slide: explicit states, idempotency, and database constraints.' },
  { id: 'demo', title: 'Demo strategy', component: DemoSlide, notes: 'Be explicit: the wallet vision is a deterministic interactive prototype, while the existing loyalty and CLINK core is working software.' },
  { id: 'closing', title: 'Closing', component: ClosingSlide, notes: 'Close with the value for both sides and invite questions.' },
];
