import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Problem from '../components/landing/Problem';
import HowItWorks from '../components/landing/HowItWorks';
import Benefits from '../components/landing/Benefits';
import Footer from '../components/landing/Footer';

function Landing() {
  return (
    <div className="min-h-screen bg-white">
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
