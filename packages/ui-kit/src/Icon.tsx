// Icon set is a 1:1 port of airegistry-prototype/claudedesign/components/primitives.jsx.
// Stroke-only line icons; the same name space is used across every AI Registry
// portal (public site + admin/provider/verifier/sovereign workspaces).

export type IconName =
  | "arrow-right"
  | "arrow-up-right"
  | "search"
  | "shield"
  | "globe"
  | "lock"
  | "eye"
  | "doc"
  | "cpu"
  | "agent"
  | "check"
  | "plus"
  | "x"
  | "sun"
  | "moon"
  | "mail"
  | "phone"
  | "pin"
  | "log-out"
  | "user"
  | "flag"
  | "flow"
  | "zap"
  | "layers"
  | "menu"
  | "more-vertical"
  | "bell"
  | "chevron-down"
  | "palette"
  | "edit"
  | "trash"
  | "inbox"
  | "users"
  | "database"
  | "settings"
  | "home-alt"
  | "audit"
  | "activity"
  | "pulse";

type IconProps = {
  name: IconName;
  size?: number;
  stroke?: number;
};

export function Icon({ name, size = 16, stroke = 1.5 }: IconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true
  };
  switch (name) {
    case "arrow-right":
      return (<svg {...props}><path d="M5 12h14M13 5l7 7-7 7" /></svg>);
    case "arrow-up-right":
      return (<svg {...props}><path d="M7 17L17 7M9 7h8v8" /></svg>);
    case "search":
      return (<svg {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
    case "shield":
      return (<svg {...props}><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" /></svg>);
    case "globe":
      return (<svg {...props}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>);
    case "lock":
      return (<svg {...props}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>);
    case "eye":
      return (<svg {...props}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>);
    case "doc":
      return (<svg {...props}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>);
    case "cpu":
      return (<svg {...props}><rect x="6" y="6" width="12" height="12" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M3 9h3M3 15h3M18 9h3M18 15h3M9 3v3M15 3v3M9 18v3M15 18v3" /></svg>);
    case "agent":
      return (<svg {...props}><circle cx="12" cy="9" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></svg>);
    case "check":
      return (<svg {...props}><path d="M5 12l5 5 9-12" /></svg>);
    case "plus":
      return (<svg {...props}><path d="M12 5v14M5 12h14" /></svg>);
    case "x":
      return (<svg {...props}><path d="M6 6l12 12M18 6L6 18" /></svg>);
    case "sun":
      return (<svg {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" /></svg>);
    case "moon":
      return (<svg {...props}><path d="M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10z" /></svg>);
    case "mail":
      return (<svg {...props}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 7 9-7" /></svg>);
    case "phone":
      return (<svg {...props}><path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>);
    case "pin":
      return (<svg {...props}><path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>);
    case "log-out":
      return (<svg {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>);
    case "user":
      return (<svg {...props}><circle cx="12" cy="9" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></svg>);
    case "flag":
      return (<svg {...props}><path d="M5 3v18M5 4h12l-2 4 2 4H5" /></svg>);
    case "flow":
      return (<svg {...props}><circle cx="5" cy="6" r="2" /><circle cx="19" cy="6" r="2" /><circle cx="12" cy="18" r="2" /><path d="M7 6h10M6 8l5 8M18 8l-5 8" /></svg>);
    case "zap":
      return (<svg {...props}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></svg>);
    case "layers":
      return (<svg {...props}><path d="M12 2l10 5-10 5L2 7l10-5zM2 12l10 5 10-5M2 17l10 5 10-5" /></svg>);
    case "menu":
      return (<svg {...props}><path d="M4 7h16M4 12h16M4 17h16" /></svg>);
    case "more-vertical":
      // Filled dots so they read at small sizes — the rest of the icon set is
      // stroke-only line art, so we override fill locally here.
      return (<svg {...props} fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.9" /><circle cx="12" cy="12" r="1.9" /><circle cx="12" cy="19" r="1.9" /></svg>);
    case "bell":
      return (<svg {...props}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>);
    case "chevron-down":
      return (<svg {...props}><path d="M6 9l6 6 6-6" /></svg>);
    case "palette":
      return (<svg {...props}><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1-1-2 1-2 2-2h2a4 4 0 0 0 4-4 9 9 0 0 0-9-8z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="14" cy="7" r="1" /><circle cx="16.5" cy="10" r="1" /></svg>);
    case "edit":
      return (<svg {...props}><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>);
    case "trash":
      return (<svg {...props}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" /></svg>);
    case "inbox":
      return (<svg {...props}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>);
    case "users":
      return (<svg {...props}><circle cx="9" cy="9" r="3.5" /><path d="M3 21a6 6 0 0 1 12 0" /><circle cx="17" cy="8" r="3" /><path d="M14 21a6 6 0 0 1 9-5" /></svg>);
    case "database":
      return (<svg {...props}><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" /></svg>);
    case "settings":
      return (<svg {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>);
    case "home-alt":
      return (<svg {...props}><path d="M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" /></svg>);
    case "audit":
      return (<svg {...props}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13l2 2 4-4" /></svg>);
    case "activity":
      return (<svg {...props}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>);
    case "pulse":
      return (<svg {...props}><path d="M22 12h-5l-2 5-4-12-2 7H2" /></svg>);
    default:
      return null;
  }
}
