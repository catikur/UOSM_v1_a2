/**
 * Ikon kumesi. Degerler SABIT, gelistirici tarafindan yazilmis SVG govdeleridir;
 * hicbiri kullanici girdisiyle birlestirilmez. Bu yuzden innerHTML ile
 * yerlestirilmeleri guvenlidir (bkz. src/app.js -> setIcon).
 * Yeni bir ikon eklemek icin buraya bir anahtar eklemek yeterlidir; veri
 * dosyalari ikonlara yalnizca ada gore atif yapar.
 */
const S = (body, opts = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.size || 20}" height="${opts.size || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${opts.weight || 2.25}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  chevron: S('<polyline points="9 18 15 12 9 6"/>'),
  back: S('<path d="m15 18-6-6 6-6"/>', { size: 16, weight: 3 }),
  check: S('<polyline points="20 6 9 17 4 12"/>', { weight: 3 }),
  reject: S('<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>', { weight: 2.5 }),
  search: S('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
  layers: S('<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>'),
  refresh: S('<path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/>'),
  activity: S('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'),
  ruler: S('<path d="M21.17 3.22a2.5 2.5 0 0 0-3.54 0L3.22 17.63a2.5 2.5 0 0 0 3.54 3.54L21.17 6.76a2.5 2.5 0 0 0 0-3.54z"/><path d="m16 8-2 2M12 12l-2 2M8 16l-2 2"/>'),
  clock: S('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
  doc: S('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'),
  hospital: S('<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M12 7v4M10 9h4"/>'),
  'hospital-x': S('<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="10" y1="7" x2="14" y2="11"/><line x1="14" y1="7" x2="10" y2="11"/>'),
  lab: S('<path d="M9 2v6.5L4.2 17A2 2 0 0 0 6 20h12a2 2 0 0 0 1.8-3L15 8.5V2"/><path d="M8 2h8"/><path d="M6.5 14h11"/>'),
  imaging: S('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>'),
  pill: S('<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>'),
  radiation: S('<circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/>'),
  target: S('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
  atom: S('<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="4.5"/><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(120 12 12)"/>', { weight: 1.8 }),
  biopsy: S('<path d="M14.5 2.5 21.5 9.5"/><path d="m18 6-10 10-5 1 1-5L14 2z"/><path d="m11 9 4 4"/>'),
  brain: S('<path d="M9.5 2A2.5 2.5 0 0 0 7 4.5v.6A3 3 0 0 0 5 8a3 3 0 0 0 .5 1.7A3 3 0 0 0 4 12.3 3 3 0 0 0 6 15v.5A3.5 3.5 0 0 0 9.5 19a2.5 2.5 0 0 0 2.5-2.5V4.5A2.5 2.5 0 0 0 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v.6A3 3 0 0 1 19 8a3 3 0 0 1-.5 1.7A3 3 0 0 1 20 12.3 3 3 0 0 1 18 15v.5A3.5 3.5 0 0 1 14.5 19a2.5 2.5 0 0 1-2.5-2.5"/>', { weight: 1.8 }),
  bolt: S('<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>'),
  bone: S('<path d="M17 10c.7-.7 1.7-1 2.5-.6a2.5 2.5 0 0 0 1.4-4.6A2.5 2.5 0 0 0 16.4 3 2.4 2.4 0 0 0 15 5L10 10l-5 5a2.4 2.4 0 0 0-2 1.4 2.5 2.5 0 0 0 1.9 4.3 2.5 2.5 0 0 0 4.6-1.4c.4-.8.1-1.8-.6-2.5"/>', { weight: 1.8 }),
  flask: S('<path d="M10 2v7.5L4.5 18A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3L14 9.5V2"/><path d="M8.5 2h7"/>'),
  dna: S('<path d="M4 2c0 5 16 5 16 10S4 17 4 22"/><path d="M20 2c0 5-16 5-16 10s16 5 16 10"/>', { weight: 1.8 }),
  bolt2: S('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'),
  warn: S('<path d="m12 3 9.5 16.5H2.5L12 3Z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="17.5" x2="12" y2="17.5"/>', { size: 16, weight: 2.5 }),
  print: S('<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>', { size: 16 }),
  copy: S('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>', { size: 16 }),
  sun: S('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>', { size: 18 }),
  moon: S('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>', { size: 18 }),
  info: S('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="8"/>', { size: 18 }),
  home: S('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>', { size: 18 }),

  // Radyofarmasotik ikonlari
  'tracer-fdg': S('<circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/>'),
  'tracer-psma': S('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/>'),
  'tracer-dota': S('<path d="M4 2c0 5 16 5 16 10S4 17 4 22"/><path d="M20 2c0 5-16 5-16 10s16 5 16 10"/>', { weight: 1.8 }),
  'tracer-choline': S('<path d="M10 2v7.5L4.5 18A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3L14 9.5V2"/><path d="M8.5 2h7"/>'),
  'tracer-bone': S('<path d="M17 10c.7-.7 1.7-1 2.5-.6a2.5 2.5 0 0 0 1.4-4.6A2.5 2.5 0 0 0 16.4 3 2.4 2.4 0 0 0 15 5L10 10l-5 5a2.4 2.4 0 0 0-2 1.4 2.5 2.5 0 0 0 1.9 4.3 2.5 2.5 0 0 0 4.6-1.4c.4-.8.1-1.8-.6-2.5"/>', { weight: 1.8 }),
  'tracer-brain': S('<path d="M9.5 2A2.5 2.5 0 0 0 7 4.5v.6A3 3 0 0 0 5 8a3 3 0 0 0 .5 1.7A3 3 0 0 0 4 12.3 3 3 0 0 0 6 15v.5A3.5 3.5 0 0 0 9.5 19a2.5 2.5 0 0 0 2.5-2.5V4.5A2.5 2.5 0 0 0 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v.6A3 3 0 0 1 19 8a3 3 0 0 1-.5 1.7A3 3 0 0 1 20 12.3 3 3 0 0 1 18 15v.5A3.5 3.5 0 0 1 14.5 19a2.5 2.5 0 0 1-2.5-2.5"/>', { weight: 1.8 }),
  'tracer-fapi': S('<path d="M14.5 2.5 21.5 9.5"/><path d="m18 6-10 10-5 1 1-5L14 2z"/><path d="m11 9 4 4"/>'),

  // Hizli secim ikonlari
  lung: S('<path d="M12 3v9"/><path d="M8.5 8.5C6 9 4 11 4 14v4a2 2 0 0 0 2 2h1.5a2 2 0 0 0 2-2v-6c0-2-.6-3-1-3.5Z"/><path d="M15.5 8.5C18 9 20 11 20 14v4a2 2 0 0 1-2 2h-1.5a2 2 0 0 1-2-2v-6c0-2 .6-3 1-3.5Z"/>', { weight: 1.8 }),
  breast: S('<circle cx="12" cy="13" r="7"/><circle cx="12" cy="13" r="2"/>', { weight: 1.8 }),
  colon: S('<path d="M5 4v8a4 4 0 0 0 4 4h2a4 4 0 0 1 4 4v0"/><path d="M5 4h6"/><path d="M19 20V8"/>', { weight: 1.8 }),
  blood: S('<path d="M12 2.7 17 8a6.5 6.5 0 1 1-10 0z"/>', { weight: 1.8 }),
  skin: S('<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="3"/>', { weight: 1.8 }),
  gi: S('<path d="M8 3v6a4 4 0 0 0 4 4 4 4 0 0 1 4 4v4"/><path d="M6 3h4"/>', { weight: 1.8 }),
  gyn: S('<circle cx="12" cy="9" r="5"/><path d="M12 14v7M9 18h6"/>', { weight: 1.8 }),
  unknown: S('<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4"/><line x1="12" y1="17.5" x2="12" y2="17.5"/>', { weight: 1.8 }),
  prostate: S('<circle cx="12" cy="12" r="8"/><path d="M8.5 13.5c1.5 2 5.5 2 7 0"/>', { weight: 1.8 }),
  net: S('<circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="m6.7 7.4 2.8 2.8M17.3 7.4l-2.8 2.8M6.7 16.6l2.8-2.8M17.3 16.6l-2.8-2.8"/>', { weight: 1.8 }),
  endocrine: S('<path d="M12 4c-3 0-5 2-5 4.5S9 13 12 13s5-2 5-4.5S15 4 12 4Z"/><path d="M12 13v7"/><path d="M9 17h6"/>', { weight: 1.8 }),
};

/** Ada gore ikon govdesi dondurur; bilinmeyen adlarda genel bir ikona duser. */
export function icon(name) {
  return ICONS[name] || ICONS.chevron;
}
