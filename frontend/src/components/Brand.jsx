import { Link } from 'react-router-dom';

function Brand({ className = '', to = '/' }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center text-[0.72rem] font-bold uppercase tracking-[0.16em] text-neutral-300 no-underline transition-colors hover:text-accent ${className}`}
    >
      Lightning Rewards
    </Link>
  );
}

export default Brand;
