import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Problem from '../components/landing/Problem';
import HowItWorks from '../components/landing/HowItWorks';
import Benefits from '../components/landing/Benefits';
import Footer from '../components/landing/Footer';

function Landing() {
  return (
    <div className="min-h-screen bg-neutral-950 bg-[radial-gradient(circle_at_12%_0%,rgba(245,165,36,0.10),transparent_32rem)]">
      <Navbar />
      <Hero />
      <Problem />
      <HowItWorks />
      <Benefits />
      <Footer />
    </div>
  );
}

export default Landing;
