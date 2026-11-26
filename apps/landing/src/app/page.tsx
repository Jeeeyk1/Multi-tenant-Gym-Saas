import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { FoundingStrip } from '@/components/FoundingStrip';
import { WhySwitchSection } from '@/components/WhySwitchSection';
import { FeaturesSection } from '@/components/FeaturesSection';
import { MemberAppSection } from '@/components/MemberAppSection';
import { HowItWorksSection } from '@/components/HowItWorksSection';
import { PricingSection } from '@/components/PricingSection';
import { FaqSection } from '@/components/FaqSection';
import { TrialSection } from '@/components/TrialSection';
import { Footer } from '@/components/Footer';
import { ChatWidget } from '@/components/ChatWidget';
import { MobileTrialBar } from '@/components/MobileTrialBar';
import { getPlans } from '@/lib/plans';
import { RevealObserver } from '@/components/RevealObserver';

export default async function LandingPage() {
  const plans = await getPlans();

  return (
    <>
      <Navbar />
      <main id="main">
        <HeroSection />
        <FoundingStrip />
        <WhySwitchSection />
        <FeaturesSection />
        <MemberAppSection />
        <HowItWorksSection />
        <PricingSection plans={plans} />
        <FaqSection />
        <TrialSection />
      </main>
      <Footer />
      <MobileTrialBar />
      <RevealObserver />
      <ChatWidget />
    </>
  );
}
