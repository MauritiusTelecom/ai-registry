import { Button, Reveal } from "@/components/library";

export function Promo() {
  return (
    <Reveal delay={60}>
      <section className="promo" aria-labelledby="home-promo-title">
        <header>
          <p className="eyebrow" style={{ margin: 0 }}>
            <span className="dot" />
            <span>For Providers</span>
          </p>
          <h2 id="home-promo-title">List your sovereign AI resource.</h2>
          <p>
            You keep hosting, access, runtime identity, and liability. The registry just helps the
            right people find you. Submission is open and reviewed within 10 working days.
          </p>
        </header>
        <Button href="/contact" intent="primary" trailingIcon="arrow-right">
          Submit a Resource
        </Button>
      </section>
    </Reveal>
  );
}
