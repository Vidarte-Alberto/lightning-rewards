import { useEffect, useMemo, useState } from 'react';

function SlideHeading({ eyebrow, title, description }) {
  return (
    <div className="presentation-heading">
      <p className="presentation-kicker">{eyebrow}</p>
      <h2>{title}</h2>
      {description && <p className="presentation-lede">{description}</p>}
    </div>
  );
}

const PROVISIONING_STEPS = [
  ['Identity created', 'A unique Nostr signing key is generated for this account.'],
  ['CLINK Enroll', 'Nenroll securely requests an account from our Lightning.Pub.'],
  ['Wallet ready', 'noffer, ndebit, and nmanage now belong to this user.'],
];

export function WalletOnboardingSlide() {
  const [mode, setMode] = useState('embedded');
  const [progress, setProgress] = useState(-1);

  useEffect(() => {
    if (progress < 0 || progress >= PROVISIONING_STEPS.length - 1) return undefined;
    const timer = window.setTimeout(() => setProgress((value) => value + 1), 650);
    return () => window.clearTimeout(timer);
  }, [progress]);

  const resetMode = (nextMode) => {
    setMode(nextMode);
    setProgress(-1);
  };

  return (
    <div>
      <SlideHeading
        eyebrow="Wallet onboarding · Interactive prototype"
        title="Join with one click—or bring the wallet you already trust."
        description="Choose a path, then create the embedded account to see how CLINK removes manual noffer and ndebit setup."
      />
      <div className="presentation-onboarding-grid">
        <section className="presentation-onboarding-choice">
          <div className="presentation-segmented" aria-label="Wallet mode">
            <button type="button" className={mode === 'embedded' ? 'is-active' : ''} onClick={() => resetMode('embedded')}>Embedded wallet</button>
            <button type="button" className={mode === 'external' ? 'is-active' : ''} onClick={() => resetMode('external')}>Connect existing</button>
          </div>
          {mode === 'embedded' ? (
            <div className="presentation-onboarding-copy">
              <span className="presentation-wallet-glyph">⚡</span>
              <div><small>Recommended</small><h3>Your Lightning wallet, ready inside Rewards.</h3></div>
              <p>No seed phrase to paste. One shared Lightning.Pub creates a private account with an independent balance.</p>
              <button type="button" onClick={() => setProgress(0)} disabled={progress >= 0 && progress < 2}>
                {progress === 2 ? 'Wallet created ✓' : progress >= 0 ? 'Creating wallet…' : 'Create my wallet'}
              </button>
            </div>
          ) : (
            <div className="presentation-onboarding-copy">
              <span className="presentation-wallet-glyph is-outline">↗</span>
              <div><small>Portable by design</small><h3>Connect any CLINK-compatible wallet.</h3></div>
              <label>Customer debit<input readOnly value="ndebit1qq…4x8p" aria-label="Mock customer debit" /></label>
              <p>External wallets keep balance and history in their own app while still earning loyalty stamps here.</p>
              <button type="button" onClick={() => setProgress(2)}>Connect wallet</button>
            </div>
          )}
        </section>

        <section className="presentation-provisioning-panel" aria-live="polite">
          <header><span>Account provisioning</span><strong>{progress === 2 ? 'Active' : progress >= 0 ? 'In progress' : 'Waiting'}</strong></header>
          <ol>
            {PROVISIONING_STEPS.map(([title, copy], index) => (
              <li key={title} className={progress >= index ? 'is-complete' : ''}>
                <span>{progress >= index ? '✓' : index + 1}</span>
                <div><strong>{title}</strong><p>{copy}</p></div>
              </li>
            ))}
          </ol>
          <div className="presentation-pointer-row">
            <div><small>Receive</small><code>{progress === 2 ? 'noffer1q3…9dk' : '—'}</code></div>
            <div><small>Pay</small><code>{progress === 2 ? 'ndebit1qc…2mv' : '—'}</code></div>
            <div><small>Manage</small><code>{progress === 2 ? 'nmanage1…7fz' : '—'}</code></div>
          </div>
        </section>
      </div>
    </div>
  );
}

const MOCK_QR = [
  1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1,
  1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1,
  1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1,
  1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1,
  1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1,
  0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0,
  1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1,
  1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1,
  1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1,
  1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0,
  1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1,
];

const INITIAL_ACTIVITY = [
  { id: 1, title: 'Wallet funded', detail: 'Incoming invoice', amount: '+5,000', inbound: true },
  { id: 2, title: 'Lightning Coffee', detail: 'Loyalty purchase', amount: '-150', inbound: false },
  { id: 3, title: 'Tacos Satoshi', detail: 'Loyalty purchase', amount: '-100', inbound: false },
];

function OverviewPanel({ balance, onNavigate }) {
  return (
    <div className="presentation-wallet-overview">
      <div className="presentation-balance-card">
        <span>Available balance</span><strong>{balance.toLocaleString()} <small>sats</small></strong>
        <div><button type="button" onClick={() => onNavigate('receive')}>↓ Receive</button><button type="button" onClick={() => onNavigate('send')}>↑ Send</button></div>
      </div>
      <div className="presentation-wallet-facts">
        <div><span>Wallet</span><strong>Lightning.Pub</strong></div>
        <div><span>Account</span><strong>npub1ivan…</strong></div>
        <div><span>Spending limit</span><strong>10,000 sats</strong></div>
      </div>
    </div>
  );
}

function ReceivePanel() {
  const [amount, setAmount] = useState(500);
  const [copied, setCopied] = useState(false);

  return (
    <div className="presentation-receive-panel">
      <div className="presentation-qr" aria-label="Mock Lightning invoice QR code">
        {MOCK_QR.map((filled, index) => <i key={index} className={filled ? 'is-filled' : ''} />)}
      </div>
      <div>
        <span className="presentation-panel-label">Receive Lightning</span>
        <strong>{amount.toLocaleString()} sats</strong>
        <div className="presentation-amount-chips">
          {[100, 500, 1000].map((value) => <button type="button" key={value} className={amount === value ? 'is-active' : ''} onClick={() => { setAmount(value); setCopied(false); }}>{value}</button>)}
        </div>
        <code>lnbc{amount}n1p…rewards…8k2</code>
        <button type="button" className="presentation-wallet-action" onClick={() => setCopied(true)}>{copied ? 'Invoice copied ✓' : 'Copy invoice'}</button>
      </div>
    </div>
  );
}

function SendPanel({ balance, onPaid }) {
  const [stage, setStage] = useState('input');
  const amount = 250;

  return (
    <div className="presentation-send-panel">
      <span className="presentation-panel-label">Pay a Lightning invoice</span>
      {stage === 'input' && (
        <>
          <label>Invoice<textarea readOnly value="lnbc2500n1p…hackathon…3dz" aria-label="Mock Lightning invoice" /></label>
          <div className="presentation-payment-summary"><span>Decoded amount</span><strong>{amount} sats</strong></div>
          <button type="button" className="presentation-wallet-action" onClick={() => setStage('confirm')}>Review payment</button>
        </>
      )}
      {stage === 'confirm' && (
        <div className="presentation-confirm-card">
          <small>Confirm payment</small><strong>{amount} sats</strong><p>To Demo Merchant · Network fee ≤ 3 sats</p>
          <div><button type="button" onClick={() => setStage('input')}>Cancel</button><button type="button" onClick={() => { onPaid(amount); setStage('paid'); }}>Pay now</button></div>
        </div>
      )}
      {stage === 'paid' && (
        <div className="presentation-payment-success"><span>✓</span><h3>Payment sent</h3><p>New balance: {balance.toLocaleString()} sats</p><button type="button" onClick={() => setStage('input')}>Send another</button></div>
      )}
    </div>
  );
}

function ActivityPanel({ activity }) {
  return (
    <div className="presentation-activity-list">
      {activity.map((item) => (
        <article key={item.id}><span className={item.inbound ? 'is-inbound' : ''}>{item.inbound ? '↓' : '↑'}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div><b className={item.inbound ? 'is-inbound' : ''}>{item.amount} sats</b></article>
      ))}
    </div>
  );
}

export function EmbeddedWalletSlide() {
  const [tab, setTab] = useState('overview');
  const [balance, setBalance] = useState(5250);
  const [activity, setActivity] = useState(INITIAL_ACTIVITY);
  const tabs = ['overview', 'receive', 'send', 'activity'];

  const registerPayment = (amount) => {
    setBalance((value) => value - amount);
    setActivity((items) => [{ id: Date.now(), title: 'Demo Merchant', detail: 'Lightning payment', amount: `-${amount}`, inbound: false }, ...items]);
  };

  return (
    <div>
      <SlideHeading
        eyebrow="Embedded wallet · Interactive prototype"
        title="The wallet lives where loyalty already happens."
        description="Try every tab. This deterministic mock demonstrates the target experience without moving real sats during the pitch."
      />
      <div className="presentation-wallet-app">
        <aside>
          <div className="presentation-wallet-avatar">IR</div>
          <div><strong>Ivan’s wallet</strong><span>Lightning.Pub · Active</span></div>
          <small>Prototype balance</small>
        </aside>
        <section>
          <nav aria-label="Wallet prototype sections">
            {tabs.map((item) => <button type="button" key={item} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)}>{item}</button>)}
          </nav>
          <div className="presentation-wallet-screen">
            {tab === 'overview' && <OverviewPanel balance={balance} onNavigate={setTab} />}
            {tab === 'receive' && <ReceivePanel />}
            {tab === 'send' && <SendPanel balance={balance} onPaid={registerPayment} />}
            {tab === 'activity' && <ActivityPanel activity={activity} />}
          </div>
        </section>
      </div>
    </div>
  );
}

const PURCHASE_STAGES = [
  { label: 'Ready', copy: 'Choose Lightning Coffee and start the purchase.' },
  { label: 'Invoice', copy: 'The business noffer returns a 150 sat BOLT11 invoice.' },
  { label: 'Paying', copy: 'The embedded account pays through our shared Lightning.Pub.' },
  { label: 'Settled', copy: 'A valid result marks the transaction PAID.' },
  { label: 'Reward', copy: 'Postgres grants stamp five exactly once and unlocks the reward.' },
];

export function LoyaltySimulationSlide() {
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setTimeout(() => {
      setStage((value) => {
        if (value >= PURCHASE_STAGES.length - 1) {
          setPlaying(false);
          return value;
        }
        return value + 1;
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [playing, stage]);

  const run = () => {
    setStage(0);
    setPlaying(true);
  };

  const completed = stage === PURCHASE_STAGES.length - 1;

  return (
    <div>
      <SlideHeading
        eyebrow="End-to-end purchase · Interactive prototype"
        title="Run the moment a Lightning payment becomes loyalty."
        description="One click animates the same state transitions enforced by the real backend."
      />
      <div className="presentation-purchase-simulator">
        <section className="presentation-checkout-mock">
          <header><div className="presentation-merchant-mark">LC</div><div><small>Lightning Coffee</small><strong>House latte</strong></div><b>150 sats</b></header>
          <div className="presentation-sim-balances"><span>Your wallet <strong>{stage >= 3 ? '5,100' : '5,250'} sats</strong></span><i>→</i><span>Business <strong>{stage >= 3 ? '21,990' : '21,840'} sats</strong></span></div>
          <button type="button" onClick={run} disabled={playing}>{playing ? 'Payment in motion…' : completed ? 'Replay purchase' : 'Pay 150 sats'}</button>
          <p className="presentation-sim-message"><span>{stage + 1}</span><strong>{PURCHASE_STAGES[stage].label}</strong>{PURCHASE_STAGES[stage].copy}</p>
        </section>
        <section className={`presentation-reward-mock ${completed ? 'is-unlocked' : ''}`}>
          <div><small>Your loyalty card</small><strong>{completed ? 'Reward unlocked!' : 'One purchase away'}</strong></div>
          <div className="presentation-mini-stamps" aria-label={completed ? 'Five of five stamps' : 'Four of five stamps'}>
            {[0, 1, 2, 3, 4].map((index) => <span key={index} className={index < 4 || completed ? 'is-filled' : ''}>⚡</span>)}
          </div>
          <p>{completed ? 'Your free house drink is ready to redeem.' : 'Next purchase: a free house drink.'}</p>
        </section>
      </div>
      <ol className="presentation-sim-timeline">
        {PURCHASE_STAGES.slice(1).map((item, index) => <li key={item.label} className={stage > index ? 'is-active' : ''}><span>{stage > index ? '✓' : index + 1}</span>{item.label}</li>)}
      </ol>
    </div>
  );
}

const PUB_ACCOUNTS = [
  { name: 'Ivan', role: 'Customer', balance: '5,100 sats', use: 'Pays and earns stamps', color: 'gold' },
  { name: 'Lightning Coffee', role: 'Business', balance: '21,990 sats', use: 'Receives and rewards', color: 'orange' },
  { name: 'Ana', role: 'Customer', balance: '2,430 sats', use: 'Independent account', color: 'blue' },
  { name: 'Tacos Satoshi', role: 'Business', balance: '8,750 sats', use: 'Independent account', color: 'green' },
];

export function MultiWalletArchitectureSlide() {
  const [selected, setSelected] = useState(0);
  const account = useMemo(() => PUB_ACCOUNTS[selected], [selected]);

  return (
    <div>
      <SlideHeading
        eyebrow="Hosted wallet architecture"
        title="One Lightning.Pub. Many isolated user accounts."
        description="Select an account to see what is private per user and what the infrastructure shares."
      />
      <div className="presentation-pub-map">
        <section className="presentation-pub-node">
          <div className="presentation-node-core"><span>⚡</span><small>One operator</small><strong>Lightning.Pub</strong><p>Account ledger + Nostr RPC</p></div>
          <div className="presentation-node-lnd"><small>Shared LND</small><strong>Channels · liquidity · routing</strong></div>
        </section>
        <div className="presentation-account-lines" aria-hidden="true"><i /><i /><i /><i /></div>
        <section className="presentation-account-grid">
          {PUB_ACCOUNTS.map((item, index) => (
            <button type="button" key={item.name} className={`${selected === index ? 'is-active' : ''} is-${item.color}`} onClick={() => setSelected(index)}>
              <span>{item.name.slice(0, 2).toUpperCase()}</span><div><strong>{item.name}</strong><small>{item.role}</small></div>
            </button>
          ))}
        </section>
        <aside className="presentation-account-detail" aria-live="polite">
          <span>Selected sub-account</span><h3>{account.name}</h3><strong>{account.balance}</strong><p>{account.use}. Its balance, history, signing key, noffer, and ndebit remain separate from every other user.</p>
          <div><small>Shared</small><b>Node + channels</b><small>Isolated</small><b>Balance + identity</b></div>
        </aside>
      </div>
    </div>
  );
}
