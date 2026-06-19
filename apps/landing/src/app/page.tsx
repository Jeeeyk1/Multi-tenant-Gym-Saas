import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { FeaturesSection } from '@/components/FeaturesSection';
import { HowItWorksSection } from '@/components/HowItWorksSection';
import { PricingSection } from '@/components/PricingSection';
import { CtaSection } from '@/components/CtaSection';
import { Footer } from '@/components/Footer';
import { ChatWidget } from '@/components/ChatWidget';

interface SaasPlan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number | null;
  features: string[];
  isPopular: boolean;
}

async function getPlans(): Promise<SaasPlan[]> {
  try {
    const url = `${process.env.API_URL ?? 'http://localhost:3000'}/api/v1/public/plans`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const plans = await getPlans();

  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection plans={plans} />
        <CtaSection />
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
}
