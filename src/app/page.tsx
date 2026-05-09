import { Hero } from "@/components/public/sections/Hero";
import { MetricsBar } from "@/components/public/sections/MetricsBar";
import { RegistrySection } from "@/components/public/sections/RegistrySection";
import { GovernanceSection } from "@/components/public/sections/GovernanceSection";
import { Orchestration } from "@/components/public/sections/Orchestration";
import { Promo } from "@/components/public/sections/Promo";
import { Faq } from "@/components/public/sections/Faq";

export default function HomePage() {
  // Vertical order matches HomePage in airegistry-prototype/claudedesign/app.jsx.
  return (
    <>
      <Hero />
      <MetricsBar />
      <RegistrySection />
      <GovernanceSection />
      <Orchestration />
      <Promo />
      <Faq />
    </>
  );
}
