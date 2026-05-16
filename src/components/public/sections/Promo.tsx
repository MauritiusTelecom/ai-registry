import { Reveal, Button } from "@/components/library";

export function Promo() {
  return (
    <section style={{ padding: "32px 32px 0" }}>
      <Reveal>
        <div className="promo">
          <div>
            <div className="eyebrow" style={{ marginBottom: 16 }}>
              <span className="dot" />
              <span>For Providers</span>
            </div>
            <h2>List your sovereign AI resource.</h2>
            <p style={{ fontSize: 16 }}>
              You keep hosting, access, runtime identity, and liability. The registry just helps the
              right people find you. Submission is open and reviewed within 10 working days.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Button href="/contact" intent="primary" trailingIcon="arrow-right">
              Submit a Resource
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
