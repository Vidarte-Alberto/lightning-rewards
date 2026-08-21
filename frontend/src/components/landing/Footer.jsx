function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10">
      <div className="max-w-5xl mx-auto px-6 py-8 text-sm text-neutral-500 text-center">
        © {year} Lightning Rewards
      </div>
    </footer>
  );
}

export default Footer;
