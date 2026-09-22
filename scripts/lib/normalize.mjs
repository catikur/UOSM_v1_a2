/**
 * Getirilen icerigi "gurultuden" arindirir.
 *
 * Amac: resmi sayfalarda her istekte degisen (CSRF jetonu, oturum kimligi,
 * ziyaret sayaci, tarih damgasi) kisimlar yuzunden sahte degisiklik alarmi
 * uretmemek. Yalnizca anlamli icerik degisince parmak izi degisir.
 */
const RULES = {
  'strip-script': (html) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' '),
  'strip-style': (html) => html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' '),
  'strip-csrf': (html) => html
    .replace(/(__RequestVerificationToken|csrf[-_]?token|VIEWSTATE|EVENTVALIDATION)[^\s"'>]*\s*=\s*["'][^"']*["']/gi, ' ')
    .replace(/<input[^>]*type=["']hidden["'][^>]*>/gi, ' '),
  'strip-dates': (html) => html
    .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, ' ')
    .replace(/\b\d{2}:\d{2}(:\d{2})?\b/g, ' '),
  'collapse-whitespace': (html) => html.replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim(),
};

export const AVAILABLE_RULES = Object.keys(RULES);

/** `watch` bir CSS secici degil, kaba bir govde ayiklayicisidir (bagimliliksiz). */
export function extractBody(html, watch) {
  if (!watch || watch === 'body') {
    const match = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    return match ? match[1] : html;
  }
  const idMatch = watch.match(/^#([\w-]+)$/);
  if (idMatch) {
    const re = new RegExp(`<([a-z]+)[^>]*id=["']${idMatch[1]}["'][^>]*>([\\s\\S]*?)</\\1>`, 'i');
    const match = html.match(re);
    if (match) return match[2];
  }
  return html;
}

/** Kurallari sirayla uygular; bilinmeyen kural sessizce gecilmez. */
export function normalize(content, rules = []) {
  let output = content;
  for (const rule of rules) {
    const fn = RULES[rule];
    if (!fn) throw new Error(`Bilinmeyen normallestirme kurali: "${rule}" (gecerli: ${AVAILABLE_RULES.join(', ')})`);
    output = fn(output);
  }
  return output;
}

/** Bir kaynak kaydi icin kanonik metni uretir. */
export function canonicalize(rawContent, source) {
  const body = source.kind === 'html' ? extractBody(rawContent, source.watch) : rawContent;
  const rules = source.kind === 'html' && !source.normalize?.includes('collapse-whitespace')
    ? [...(source.normalize || []), 'collapse-whitespace']
    : source.normalize || [];
  return normalize(body, rules);
}
