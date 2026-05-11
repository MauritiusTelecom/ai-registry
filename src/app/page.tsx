import { Hero } from "@/components/public/sections/Hero";
import { RegistrySection } from "@/components/public/sections/RegistrySection";
import { WhatGetsListed } from "@/components/public/sections/WhatGetsListed";
import { ListingCriteria } from "@/components/public/sections/ListingCriteria";
import { HowItWorks } from "@/components/public/sections/HowItWorks";
import { Promo } from "@/components/public/sections/Promo";
import { Faq } from "@/components/public/sections/Faq";

export default function HomePage() {
  // Vertical order: hero → registry preview → what gets listed →
  // listing criteria (sovereignty test) → how it works → promo → faq.
  return (
    <>
      <Hero />
      <RegistrySection />
      <WhatGetsListed />
      <ListingCriteria />
      <HowItWorks />
      <Promo />
      <Faq />
    </>
  );
}
