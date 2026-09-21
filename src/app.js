/**
 * UI katmani. Klinik karar vermez; yalnizca src/engine.js'in urettigi
 * gorunumu cizer ve kullanici olaylarini motora iletir.
 *
 * Guvenlik notu: kullanici kaynakli hicbir metin innerHTML ile
 * yerlestirilmez. Metinler textContent ile, ikonlar ise yalnizca
 * src/icons.js icindeki sabit SVG tablosundan yazilir.
 */
import { Wizard, createBundle } from './engine.js';
import { icon } from './icons.js';

/* ---------------------------------------------------------------- yardimci */

const $ = (sel, root = document) => root.querySelector(sel);

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

/** Sabit SVG tablosundan ikon yerlestirir (kullanici verisi karismaz). */
function iconEl(name, className) {
  const span = el('span', { class: className, 'aria-hidden': 'true' });
  span.innerHTML = icon(name);
  return span;
}

function badge(name, tone) {
  const variant = tone === 'danger' ? 'badge badge--danger' : tone === 'ok' ? 'badge badge--ok' : tone === 'muted' ? 'badge badge--muted' : 'badge';
  return iconEl(name, variant);
}

/* --------------------------------------------------------------- uygulama */

export function mountApp(rootBundle, options = {}) {
  let bundle = rootBundle;
  let wizard = new Wizard(bundle);

  const dom = {
    splash: $('#splash'),
    app: $('#app'),
    body: $('#wizard-body'),
    trail: $('#trail'),
    trailList: $('#trail-list'),
    back: $('#btn-back'),
    reset: $('#btn-reset'),
    theme: $('#btn-theme'),
    subtitle: $('#app-subtitle'),
    dataVersion: $('#data-version'),
    author: $('#app-author'),
    toast: $('#toast'),
    live: $('#live-region'),
  };

  /* ---- tema ---- */

  const THEME_KEY = 'petct-sgk-theme';
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    dom.theme.replaceChildren(iconEl(theme === 'dark' ? 'sun' : 'moon'));
    dom.theme.setAttribute('aria-label', theme === 'dark' ? 'Acik temaya gec' : 'Koyu temaya gec');
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* gizli sekmede sessizce gec */ }
  }
  function initTheme() {
    let stored = null;
    try { stored = localStorage.getItem(THEME_KEY); } catch { /* yoksay */ }
    const preferred = stored || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(preferred);
  }
  dom.theme.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  /* ---- bildirim ---- */

  let toastTimer;
  function toast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => dom.toast.classList.remove('is-visible'), 4000);
  }

  function announce(message) {
    dom.live.textContent = message;
  }

  /* ---- ust bilgi ---- */

  function paintChrome() {
    const rev = bundle.meta.regulation.trackedRevision;
    dom.subtitle.textContent = rev.label;
    dom.dataVersion.textContent = `Veri surumu ${bundle.meta.dataVersion}`;
    dom.author.textContent = bundle.meta.app.author;
    document.title = bundle.meta.app.title;
  }

  /* ---- izlenen yol ---- */

  function paintTrail(trail) {
    dom.trail.hidden = trail.length === 0;
    dom.trailList.replaceChildren(...trail.map((label) => el('li', { class: 'trail__chip', text: label })));
    dom.trailList.scrollLeft = dom.trailList.scrollWidth;
  }

  /* ---- ekranlar ---- */

  function renderQuestion(view) {
    const options = el('div', { class: 'options', role: 'group', 'aria-label': view.question });
    view.options.forEach((opt, index) => {
      const texts = [el('span', { text: opt.label })];
      if (opt.note) texts.push(el('span', { class: 'choice__note', text: opt.note }));
      options.append(
        el('button', {
          type: 'button',
          class: opt.tone === 'danger' ? 'choice choice--danger' : 'choice',
          onClick: () => select(opt.id),
          dataset: { optionId: opt.id },
        }, [
          badge(opt.icon, opt.tone),
          el('span', { class: 'choice__text' }, texts),
          index < 9 ? el('kbd', { class: 'choice__key', text: String(index + 1) }) : null,
        ]),
      );
    });

    dom.body.replaceChildren(el('div', { class: 'fade-up' }, [
      el('h2', { class: 'question', text: view.question }),
      view.hint ? el('p', { class: 'hint', text: view.hint }) : null,
      options,
    ]));
    announce(view.question);
  }

  function renderIcd(view) {
    const error = el('p', { class: 'form-error', role: 'alert', hidden: true });
    const input = el('input', {
      type: 'text',
      id: 'icd-input',
      class: 'icd__field',
      placeholder: 'Orn: C34',
      autocomplete: 'off',
      autocapitalize: 'characters',
      spellcheck: 'false',
      inputmode: 'text',
      'aria-label': view.prompt,
      'aria-describedby': 'icd-help',
    });

    function submit(raw) {
      const result = wizard.submitIcd(raw ?? input.value);
      if (!result.ok) {
        error.textContent = result.error;
        error.hidden = false;
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        announce(result.error);
        return;
      }
      paint();
    }

    input.addEventListener('input', () => {
      error.hidden = true;
      input.removeAttribute('aria-invalid');
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); submit(); }
    });

    const quick = view.quickPicks.length
      ? el('div', { class: 'quick' }, [
          el('p', { class: 'quick__label', text: 'Hizli secim' }),
          el('div', { class: 'quick__grid' }, view.quickPicks.map((pick) =>
            el('button', {
              type: 'button',
              class: 'quick__btn',
              onClick: () => submit(pick.code),
              'aria-label': `${pick.label} (${pick.code})`,
            }, [
              iconEl(pick.icon),
              el('span', { class: 'quick__code', text: pick.code }),
              el('span', { class: 'quick__name', text: pick.label }),
            ]))),
        ])
      : null;

    dom.body.replaceChildren(el('div', { class: 'icd fade-up' }, [
      el('h2', { class: 'question', text: view.prompt }),
      el('p', { class: 'hint', id: 'icd-help', text: `${view.tracer.label} icin gecerli tani kodu. Nokta kullanabilirsiniz (orn. C50.9).` }),
      input,
      error,
      el('button', { type: 'button', class: 'btn-primary', onClick: () => submit() }, ['Kontrol et']),
      quick,
    ]));

    input.focus({ preventScroll: true });
    announce(view.prompt);
  }

  function renderResult(view) {
    const ok = view.status === 'covered';

    const summary = ok
      ? el('div', { class: 'summary' }, [
          el('div', { class: 'summary__row' }, [
            el('p', { class: 'summary__label', text: 'Bildirilecek endikasyon' }),
            el('p', { class: 'summary__value', text: view.indication || '-' }),
          ]),
          view.code ? el('div', { class: 'summary__row' }, [
            el('p', { class: 'summary__label', text: 'Gecerli ICD-10' }),
            el('p', { class: 'summary__value summary__value--code', text: view.code }),
            view.codeEntry?.label ? el('p', { class: 'summary__value summary__value--muted', text: view.codeEntry.label }) : null,
          ]) : null,
          view.sutRefs?.length ? el('div', { class: 'summary__row' }, [
            el('p', { class: 'summary__label', text: 'Dayanak' }),
            ...view.sutRefs.map((ref) => el('p', { class: 'summary__value summary__value--muted', text: ref.label })),
          ]) : null,
        ])
      : null;

    const notices = (view.warnings || []).length
      ? el('div', { class: 'notices' }, view.warnings.map((text) =>
          el('div', { class: 'notice' }, [iconEl('warn'), el('span', { text })])))
      : null;

    dom.body.replaceChildren(el('div', { class: `result fade-up ${ok ? 'result--ok' : 'result--no'}` }, [
      iconEl(ok ? 'check' : 'reject', 'result__icon'),
      el('h2', { class: 'result__title', text: ok ? 'SGK UYGUN' : 'KAPSAM DISI' }),
      view.reason ? el('p', { class: 'result__reason', text: view.reason }) : null,
      summary,
      notices,
      el('div', { class: 'result__actions' }, [
        el('button', { type: 'button', class: 'btn-secondary', onClick: () => copySummary(view) }, [iconEl('copy'), 'Ozeti kopyala']),
        el('button', { type: 'button', class: 'btn-secondary', onClick: () => window.print() }, [iconEl('print'), 'Yazdir']),
      ]),
    ]));
    announce(ok ? `Sonuc: SGK uygun. ${view.indication || ''}` : `Sonuc: kapsam disi. ${view.reason || ''}`);
  }

  /** Sonucu duz metin olarak panoya kopyalar (rapor/epikriz icin). */
  async function copySummary(view) {
    const rev = bundle.meta.regulation.trackedRevision;
    const lines = [
      `PET/BT SGK uygunluk degerlendirmesi (${rev.label})`,
      `Sonuc: ${view.status === 'covered' ? 'SGK UYGUN' : 'KAPSAM DISI'}`,
      view.indication ? `Endikasyon: ${view.indication}` : null,
      view.code ? `ICD-10: ${view.code}${view.codeEntry?.label ? ` - ${view.codeEntry.label}` : ''}` : null,
      view.reason ? `Gerekce: ${view.reason}` : null,
      `Izlenen yol: ${view.trail.join(' > ')}`,
      ...(view.warnings || []).map((w) => `Uyari: ${w}`),
      `Veri surumu: ${bundle.meta.dataVersion}`,
      bundle.meta.disclaimer.short,
    ].filter(Boolean);

    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast('Ozet panoya kopyalandi.');
    } catch {
      toast('Kopyalama desteklenmiyor; metni secip kopyalayabilirsiniz.');
    }
  }

  /* ---- akis kontrolu ---- */

  function select(optionId) {
    try {
      wizard.choose(optionId);
      paint();
    } catch (error) {
      console.error(error);
      toast('Beklenmeyen bir durum olustu, akis basa alindi.');
      wizard.reset();
      paint();
    }
  }

  function paint() {
    const view = wizard.currentView();
    paintTrail(view.trail);
    dom.back.hidden = !wizard.canGoBack;
    if (view.kind === 'icd') renderIcd(view);
    else if (view.kind === 'result') renderResult(view);
    else renderQuestion(view);
  }

  dom.back.addEventListener('click', () => { if (wizard.back()) paint(); });
  dom.reset.addEventListener('click', () => { wizard.reset(); paint(); });

  // Klavye: 1-9 secenek, Backspace geri, Esc basa don
  document.addEventListener('keydown', (event) => {
    if (dom.app.hidden) return;
    const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
    if (event.key === 'Escape') { wizard.reset(); paint(); return; }
    if (event.key === 'Backspace' && !typing) { event.preventDefault(); if (wizard.back()) paint(); return; }
    if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (/^[1-9]$/.test(event.key)) {
      const buttons = dom.body.querySelectorAll('.choice');
      buttons[Number(event.key) - 1]?.click();
    }
  });

  /* ---- veri tazeleme ---- */

  /**
   * Arka planda daha yeni bir veri paketi arar.
   * Basarisiz olursa sessizce gomulu anlik goruntuyle devam eder;
   * cevrimdisi veya file:// kullanimi bu yuzden bozulmaz.
   */
  async function refreshBundle({ silent = true } = {}) {
    const rt = bundle.meta.runtime;
    if (!rt?.autoRefresh || !rt.bundleUrl) return false;
    try {
      const response = await fetch(`${rt.bundleUrl}?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const fresh = await response.json();
      if (!fresh?.meta?.dataVersion) throw new Error('Paket bicimi taninmadi');
      if (fresh.meta.dataVersion === bundle.meta.dataVersion && fresh.generatedAt === bundle.generatedAt) return false;

      bundle = createBundle({ ...fresh, generatedAt: fresh.generatedAt });
      wizard = new Wizard(bundle);
      paintChrome();
      paint();
      toast(`Veri guncellendi: surum ${bundle.meta.dataVersion}`);
      return true;
    } catch (error) {
      if (!silent) toast('Guncel veri alinamadi; gomulu surum kullaniliyor.');
      return false;
    }
  }

  function scheduleRefresh() {
    const rt = bundle.meta.runtime;
    if (!rt?.autoRefresh) return;
    refreshBundle();
    if (rt.refreshIntervalMinutes > 0) {
      setInterval(() => refreshBundle(), rt.refreshIntervalMinutes * 60_000);
    }
    if (rt.refreshOnFocus) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') refreshBundle();
      });
    }
  }

  /* ---- giris ekrani ---- */

  function start() {
    dom.splash.classList.add('is-leaving');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.body).backgroundColor);
    setTimeout(() => {
      dom.splash.hidden = true;
      dom.app.hidden = false;
      requestAnimationFrame(() => dom.app.classList.remove('is-entering'));
      dom.body.querySelector('.choice')?.focus({ preventScroll: true });
    }, 420);
  }

  dom.splash.addEventListener('click', start);
  dom.splash.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); start(); }
  });

  initTheme();
  paintChrome();
  paint();
  scheduleRefresh();

  if (options.skipSplash) start();

  return { refreshBundle, get bundle() { return bundle; } };
}

/** HTML icine gomulu anlik goruntuyu okur ve uygulamayi baslatir. */
export function boot() {
  const raw = document.getElementById('bundle-snapshot')?.textContent;
  if (!raw) throw new Error('Gomulu veri paketi bulunamadi.');
  const bundle = createBundle(JSON.parse(raw));
  return mountApp(bundle);
}
