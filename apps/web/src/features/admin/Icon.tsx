import type { ReactNode } from "react";

const glyphs: Record<string, ReactNode> = {
  overview: <><path d="M3 3v18h18" /><path d="m7 14 4-4 4 4 6-7" /></>,
  projects: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></>,
  certificates: <><circle cx="12" cy="8" r="5" /><path d="m8.5 12-1 8 4.5-2.5 4.5 2.5-1-8" /></>,
  skills: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m8 12 2.5 2.5L16 9" /></>,
  timeline: <><path d="M12 3v18M5 6h14M5 12h14M5 18h14" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /></>,
  education: <><path d="m3 9 9-5 9 5-9 5-9-5Z" /><path d="M7 12v5c3.3 2.2 6.7 2.2 10 0v-5M21 9v6" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4.2 3.5-6 8-6s7.2 1.8 8 6" /></>,
  messages: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  media: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8" cy="9" r="1.5" /><path d="m4 17 5-5 4 3 3-2 4 4" /></>,
  ai: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></>,
  security: <><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.6v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6.3v-2.6h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2H15v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z" transform="translate(-1 -1) scale(.9)" /></>,
  audit: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  chevronLeft: <><path d="m14 18-6-6 6-6" /></>,
  chevronRight: <><path d="m10 18 6-6-6-6" /></>,
  chevronDown: <><path d="m6 9 6 6 6-6" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  upload: <><path d="M12 16V4m0 0L7 9m5-5 5 5" /><path d="M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></>,
  activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  eye: <><path d="M2 12s3.4-6 10-6 10 6 10 6-3.4 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  alert: <><path d="M10.3 4.3 2.7 18a2 2 0 0 0 1.8 3h15a2 2 0 0 0 1.8-3L13.7 4.3a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
  trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></>,
  file: <><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z" /><path d="M13 3v7h7" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 5v2" /></>,
  panel: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></>,
  dashboard: <><rect x="3" y="3" width="7.5" height="7.5" rx="1.8" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8" /></>,
  bell: <><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  rocket: <><path d="M12 15c5-4 7-8.5 7-12-3.5 0-8 2-12 7l-3 1 3 4 4 3 1-3Z" /><path d="M9 12c1.5 1.5 3.5 3.5 6 6" /><circle cx="15" cy="9" r="1.4" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></>,
  graduation: <><path d="m2.5 9 9.5-4.5L21.5 9 12 13.5 2.5 9Z" /><path d="M6.5 11.5V16c3 2 8 2 11 0v-4.5M22 9v5" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20c.7-3.8 3-5.5 6-5.5s5.3 1.7 6 5.5" /><circle cx="17" cy="9" r="2.6" /><path d="M16.5 14.6c2.3.3 3.9 1.8 4.5 4.4" /></>,
  chart: <><path d="M3 3v18h18" /><path d="M7 15v3M12 10v8M17 6v12" /></>,
  bot: <><rect x="5" y="9" width="14" height="10" rx="2.5" /><path d="M12 9V5M9 5h6" /><circle cx="9.5" cy="13.5" r="1" fill="currentColor" stroke="none" /><circle cx="14.5" cy="13.5" r="1" fill="currentColor" stroke="none" /><path d="M9.5 16.5h5" /></>,
  book: <><path d="M5 4a2 2 0 0 1 2-2h13v16H7a2 2 0 0 0-2 2V4Z" /><path d="M5 18a2 2 0 0 1 2-2h13" /></>,
  plug: <><path d="M9 3v6M15 3v6M7 6h10v4a5 5 0 0 1-10 0V6Z" /><path d="M12 15v6" /></>,
  inbox: <><path d="M3 13v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6l-2.5-8h-13L3 13Z" /><path d="M3 13h6l1.5 2h3L15 13h6" /></>,
  collapse: <><path d="m14 6-6 6 6 6" /></>,
};

export type AdminIconName = keyof typeof glyphs;

export function AdminIcon({ name, size = 18, className }: { name: AdminIconName; size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {glyphs[name]}
    </svg>
  );
}
