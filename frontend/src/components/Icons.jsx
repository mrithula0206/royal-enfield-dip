const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

function Svg({ size = 18, children, ...rest }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>{children}</svg>;
}

export const IconUsers = (p) => (
  <Svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>
);
export const IconChat = (p) => (
  <Svg {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></Svg>
);
export const IconCalendarCheck = (p) => (
  <Svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="m9 16 2 2 4-4" /></Svg>
);
export const IconUserPlus = (p) => (
  <Svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" /></Svg>
);
export const IconClock = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></Svg>
);
export const IconTrash = (p) => (
  <Svg {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" /></Svg>
);
export const IconBell = (p) => (
  <Svg {...p}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></Svg>
);
export const IconFilter = (p) => (
  <Svg {...p}><path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z" /></Svg>
);
export const IconChevronDown = (p) => (
  <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>
);
export const IconCalendar = (p) => (
  <Svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Svg>
);
export const IconSearch = (p) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Svg>
);
export const IconHome = (p) => (
  <Svg {...p}><path d="m3 10 9-7 9 7" /><path d="M5 9v11a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9" /></Svg>
);
export const IconMapPin = (p) => (
  <Svg {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></Svg>
);
export const IconBuilding = (p) => (
  <Svg {...p}><rect x="4" y="2" width="16" height="20" rx="1" /><path d="M9 22v-4h6v4M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" /></Svg>
);
export const IconBike = (p) => (
  <Svg {...p}><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="18.5" cy="17.5" r="3.5" /><path d="M12 17.5V14l-3-4h6l2 4M9 10l2-3h2" /></Svg>
);
export const IconShare = (p) => (
  <Svg {...p}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" /></Svg>
);
export const IconMegaphone = (p) => (
  <Svg {...p}><path d="M3 11v3a1 1 0 0 0 1 1h2l4 5V6l-4 5H4a1 1 0 0 0-1 1z" /><path d="M14 7a5 5 0 0 1 0 10M18 4a9 9 0 0 1 0 16" /></Svg>
);
export const IconShield = (p) => (
  <Svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></Svg>
);
export const IconCompass = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m16 8-2 6-6 2 2-6z" /></Svg>
);
export const IconSparkle = (p) => (
  <Svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></Svg>
);
export const IconFileText = (p) => (
  <Svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6M9 9h1" /></Svg>
);
export const IconBarChart = (p) => (
  <Svg {...p}><path d="M3 20h18" /><rect x="6" y="10" width="3" height="8" /><rect x="11" y="5" width="3" height="13" /><rect x="16" y="13" width="3" height="5" /></Svg>
);
export const IconDatabase = (p) => (
  <Svg {...p}><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></Svg>
);
export const IconTarget = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></Svg>
);
export const IconUserCog = (p) => (
  <Svg {...p}><circle cx="9" cy="8" r="4" /><path d="M2 21v-1a6 6 0 0 1 9-5.2" /><circle cx="18" cy="17" r="3" /><path d="M18 13.5v1M18 19.5v1M14.8 15.2l.9.5M20.3 18.3l.9.5M14.8 18.8l.9-.5M20.3 15.7l.9-.5" /></Svg>
);
export const IconRefresh = (p) => (
  <Svg {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></Svg>
);
export const IconScroll = (p) => (
  <Svg {...p}><path d="M8 21h9a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v11" /><path d="M13 2v5h5M6 21a2 2 0 0 1-2-2v-1h4v1a2 2 0 0 1-2 2z" /></Svg>
);
export const IconChevronLeft = (p) => (
  <Svg {...p}><path d="m15 18-6-6 6-6" /></Svg>
);
export const IconWhatsapp = (p) => (
  <Svg {...p} fill="currentColor" stroke="none"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.4 1.3-1.93 1.35-.5.05-1.02.24-3.42-.71-2.9-1.15-4.76-4.1-4.9-4.29-.14-.19-1.17-1.56-1.17-2.98 0-1.42.75-2.11 1.01-2.4.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.65.5.24.58.82 2 .9 2.14.07.15.12.32.02.51-.1.19-.15.31-.3.48-.15.17-.31.38-.45.51-.15.14-.3.3-.13.58.17.29.76 1.26 1.64 2.04 1.13 1 2.08 1.32 2.37 1.47.29.14.45.12.62-.07.17-.19.72-.84.92-1.13.19-.28.38-.24.63-.14.26.1 1.65.78 1.93.92.29.14.48.22.55.34.07.13.07.72-.17 1.4z"/></Svg>
);
