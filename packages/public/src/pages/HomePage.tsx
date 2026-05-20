import { PluginSlot } from "@airegistry/plugin-host/slot";
import { Hero } from "../sections/Hero";
import { RegistrySection } from "../sections/RegistrySection";
import { WhatGetsListed } from "../sections/WhatGetsListed";
import { ListingCriteria } from "../sections/ListingCriteria";
import { HowItWorks } from "../sections/HowItWorks";
import { Promo } from "../sections/Promo";
import { Faq } from "../sections/Faq";
import { getBranding } from "@airegistry/core/branding";

export default async function HomePage() {
  // Vertical order: hero → registry preview → what gets listed →
  // listing criteria (sovereignty test) → how it works → promo → faq.
  const branding = await getBranding();
  return (
    <>
      <Hero
        eyebrowText={branding.heroEyebrowText}
        eyebrowIconUrl={branding.heroEyebrowIconUrl}
      />
      <PluginSlot id="public.home.hero.below" />
      <RegistrySection />
      <WhatGetsListed />
      <ListingCriteria />
      <HowItWorks />
      <Promo />
      <Faq />
    </>
  );
}
