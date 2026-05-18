import { Hero } from "@/components/public/sections/Hero";
import { WhatGetsListed } from "@/components/public/sections/WhatGetsListed";
import { ListingCriteria } from "@/components/public/sections/ListingCriteria";
import { HowItWorks } from "@/components/public/sections/HowItWorks";
import { Promo } from "@/components/public/sections/Promo";
import { Faq } from "@/components/public/sections/Faq";
import { getBranding } from "@/lib/branding";

export default async function HomePage() {
  const branding = await getBranding();
  return (
    <>
      <Hero
        eyebrowText={branding.heroEyebrowText}
        eyebrowIconUrl={branding.heroEyebrowIconUrl}
      />
      <WhatGetsListed />
      <ListingCriteria />
      <HowItWorks />
      <Promo />
      <Faq />
    </>
  );
}
