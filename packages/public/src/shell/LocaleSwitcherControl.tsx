"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { resolveLocaleSwitcherMode, sortUiLocales } from "@/i18n/locale-config";
import { useTransition } from "react";
import { Icon } from "@airegistry/ui-kit";

type Variant = "nav" | "portal";

const mono: CSSProperties = {
  fontFamily: "IBM Plex Mono, monospace",
  letterSpacing: "0.04em"
};

function localeDisplayName(
  code: Locale,
  t: ReturnType<typeof useTranslations<"localeSwitcher">>
): string {
  try {
    const label = t(code);
    if (label && !label.startsWith("localeSwitcher.")) return label;
  } catch {
    /* missing key — fall back to code */
  }
  return code.toUpperCase();
}

function LocalePickerModal({
  open,
  onClose,
  locales,
  current,
  onPick,
  pending
}: {
  open: boolean;
  onClose: () => void;
  locales: readonly Locale[];
  current: Locale;
  onPick: (locale: Locale) => void;
  pending: boolean;
}) {
  const t = useTranslations("localeSwitcher");
  const tCommon = useTranslations("common");

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const compact = locales.length <= LOCALE_SWITCHER_GRID_COMPACT_MAX;

  return (
    <div className="locale-picker-backdrop" onClick={onClose} role="presentation">
      <div
        className={`locale-picker-dialog${compact ? " locale-picker-dialog--compact" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("chooseLanguage")}
      >
        <div className="locale-picker-head">
          <div>
            <div className="locale-picker-title">{t("chooseLanguage")}</div>
            <div className="locale-picker-sub">
              {localeDisplayName(current, t)} · {locales.length}{" "}
              {locales.length === 1 ? "language" : "languages"}
            </div>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={tCommon("close")}
          >
            <Icon name="x" size={14} />
          </button>
        </div>
        <ul
          className="locale-picker-list"
          style={{ "--locale-count": String(locales.length) } as CSSProperties}
        >
          {locales.map((code) => {
            const active = code === current;
            return (
              <li key={code}>
                <button
                  type="button"
                  className={`locale-picker-option${active ? " is-active" : ""}`}
                  onClick={() => onPick(code)}
                  disabled={pending || active}
                  aria-current={active ? "true" : undefined}
                >
                  <span className="locale-picker-option-body">
                    <span className="locale-picker-code">{code.toUpperCase()}</span>
                    <span className="locale-picker-name">{localeDisplayName(code, t)}</span>
                  </span>
                  {active ? (
                    <span className="locale-picker-check" aria-hidden>
                      <Icon name="check" size={16} />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Fewer languages → tighter modal grid on desktop. */
const LOCALE_SWITCHER_GRID_COMPACT_MAX = 6;

export function LocaleSwitcherControl({ variant = "nav" }: { variant?: Variant }) {
  const t = useTranslations("localeSwitcher");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);

  const locales = sortUiLocales(routing.locales as readonly Locale[], (code) =>
    localeDisplayName(code, t)
  );
  const mode = resolveLocaleSwitcherMode(locales.length);
  const isNav = variant === "nav";
  const currentCode = locale.toUpperCase();

  function goTo(nextLocale: Locale) {
    if (nextLocale === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
      setModalOpen(false);
    });
  }

  const triggerStyle: CSSProperties = isNav
    ? { fontSize: 12, ...mono, minWidth: 40 }
    : { fontSize: 11, ...mono, fontWeight: 600, minWidth: 40 };

  if (mode === "toggle") {
    const otherLocale =
      locales.find((l) => l !== locale) ?? (locale === "fr" ? "en" : "fr");
    return (
      <button
        type="button"
        className={isNav ? "theme-toggle" : "p-icon-btn"}
        onClick={() => goTo(otherLocale)}
        disabled={isPending}
        aria-label={t("label")}
        title={t("switchTo", { language: localeDisplayName(otherLocale, t) })}
        style={triggerStyle}
      >
        {currentCode}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className={isNav ? "theme-toggle" : "p-icon-btn"}
        onClick={() => setModalOpen(true)}
        disabled={isPending}
        aria-label={t("chooseLanguage")}
        aria-haspopup="dialog"
        aria-expanded={modalOpen}
        title={t("chooseLanguage")}
        style={triggerStyle}
      >
        {currentCode}
      </button>
      <LocalePickerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        locales={locales}
        current={locale}
        onPick={goTo}
        pending={isPending}
      />
    </>
  );
}
