/**
 * PET/BT SGK uygunluk karar motoru.
 *
 * Tamamen saf (DOM'suz) bir modul: hem tarayicida hem de `node --test`
 * altinda ayni kodla calisir. Klinik bilgi burada DEGIL, data/ altindaki
 * JSON dosyalarindadir; bu dosya yalnizca o veriyi yorumlar.
 */

/** ICD-10 kodu icin kabul edilen bicim (C34, C7A, E21.0, R97.2, D3A ...). */
export const ICD_PATTERN = /^[A-Z][0-9][0-9A-Z](?:\.?[0-9A-Z]{1,4})?$/;

/** Turkce klavyeden gelebilecek harfleri ASCII karsiligina cevirir. */
const TR_TO_ASCII = { İ: 'I', I: 'I', ı: 'I', Ş: 'S', ş: 'S', Ğ: 'G', ğ: 'G', Ü: 'U', ü: 'U', Ö: 'O', ö: 'O', Ç: 'C', ç: 'C' };

/**
 * Kullanici girdisini kanonik ICD-10 bicimine getirir.
 * Bosluklari ve ayraclari temizler, harfleri buyutur.
 */
export function normalizeIcd(raw) {
  if (typeof raw !== 'string') return '';
  const mapped = [...raw.trim()].map((ch) => TR_TO_ASCII[ch] ?? ch).join('');
  return mapped.toUpperCase().replace(/[\s\-_/]/g, '');
}

/** Girdinin ICD-10 bicimine uyup uymadigini soyler. */
export function isWellFormedIcd(code) {
  return ICD_PATTERN.test(code);
}

/**
 * `{code}`, `{params.x}`, `{marker.label}` gibi belirtecleri baglamdan doldurur.
 * Bilinmeyen belirtec bulunursa oldugu gibi birakilir (sessiz veri kaybi olmasin).
 */
export function renderTemplate(input, ctx) {
  if (typeof input !== 'string') return input;
  return input.replace(/\{([a-zA-Z0-9_.]+)\}/g, (match, path) => {
    const value = path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), ctx);
    return value == null ? match : String(value);
  });
}

/**
 * Veri icindeki kosul ifadelerini degerlendirir.
 * Desteklenen isleclerin listesi data/rules.json -> predicateOps ile senkrondur.
 */
export function evaluatePredicate(pred, ctx) {
  if (pred == null) return true;
  if (typeof pred === 'boolean') return pred;
  if (pred.always !== undefined) return Boolean(pred.always);
  if (pred.allOf) return pred.allOf.every((p) => evaluatePredicate(p, ctx));
  if (pred.anyOf) return pred.anyOf.some((p) => evaluatePredicate(p, ctx));
  if (pred.not) return !evaluatePredicate(pred.not, ctx);
  if (pred.icdStartsWith) {
    const icd = ctx.code || '';
    return pred.icdStartsWith.some((prefix) => icd.startsWith(prefix));
  }
  if (pred.tracerIs) return pred.tracerIs.includes(ctx.tracerId);
  if (pred.facilityIs) return pred.facilityIs.includes(ctx.facilityId);
  throw new Error(`Bilinmeyen kosul isleci: ${JSON.stringify(pred)}`);
}

/** `extends` zincirini cozerek bir kod kumesinin tum kodlarini dondurur. */
export function resolveCodeSet(bundle, setId, seen = new Set()) {
  const set = bundle.codeSets.sets.find((s) => s.id === setId);
  if (!set) throw new Error(`Tanimsiz kod kumesi: ${setId}`);
  if (seen.has(setId)) throw new Error(`Kod kumelerinde dongusel 'extends': ${setId}`);
  seen.add(setId);

  const inherited = (set.extends || []).flatMap((parentId) => resolveCodeSet(bundle, parentId, seen).codes);
  // Kendi kodlari mirasi ezer (ayni kod iki kez varsa yereldeki kazanir).
  const ownCodes = set.codes || [];
  const byCode = new Map();
  for (const entry of [...inherited, ...ownCodes]) byCode.set(entry.code, entry);

  return { ...set, codes: [...byCode.values()] };
}

/**
 * Bir ICD kodunu kod kumesiyle esler.
 * Eslestirme "onek" mantigiyla yapilir: C349 -> C34.
 * En uzun onek kazanir, boylece C7A gibi ozel kodlar C7 ile karismaz.
 */
export function matchCode(bundle, setId, code) {
  const set = resolveCodeSet(bundle, setId);
  let best = null;
  for (const entry of set.codes) {
    const key = entry.code.replace('.', '');
    const plain = code.replace('.', '');
    if (plain.startsWith(key) && (!best || key.length > best.code.replace('.', '').length)) best = entry;
  }
  return { set, entry: best, matched: Boolean(best) };
}

/** ICD koduna (veya radyofarmasotige) gore tumor belirteci metnini secer. */
export function resolveMarker(bundle, code, tracerId) {
  const markers = bundle.tumorMarkers;
  for (const mapping of markers.mappings) {
    if (mapping.codes.some((prefix) => code.startsWith(prefix))) return mapping;
  }
  const override = (markers.tracerOverrides || []).find((o) => o.tracer === tracerId);
  if (override) return override;
  return markers.default;
}

/** `start` dugumunun secenekleri data/tracers.json'dan uretilir. */
function tracerOptions(bundle) {
  return [...bundle.tracers.tracers]
    .sort((a, b) => a.order - b.order)
    .map((tracer) => ({
      id: tracer.id,
      label: tracer.sutCode ? `${tracer.label} (${tracer.sutCode})` : tracer.label,
      note: tracer.summary,
      icon: tracer.icon,
      tone: tracer.covered ? 'neutral' : 'danger',
      _tracer: tracer,
    }));
}

/** Kisa gecmis rozeti metni (uzun etiketleri kisaltir). */
function chipLabel(text, limit = 22) {
  const base = String(text).split('(')[0].trim();
  return base.length > limit ? `${base.slice(0, limit - 1)}…` : base;
}

/**
 * Karar akisinin durum makinesi.
 * Her `choose`/`submitIcd` cagrisi bir adim ilerletir, `back` bir adim geri alir.
 * Gecmis, tam durum anlik goruntusu olarak saklanir; bu sayede geri alma
 * sirasinda ICD veya kurum bilgisi "yapisik" kalmaz.
 */
export class Wizard {
  constructor(bundle) {
    this.bundle = bundle;
    this.reset();
  }

  reset() {
    this.state = {
      nodeId: this.bundle.rules.entryNode,
      params: {},
      tracerId: null,
      code: '',
      codeEntry: null,
      facilityId: null,
      outcome: null,
      warnings: [],
      trail: [],
    };
    this.history = [];
    return this;
  }

  /** Geri alinabilir bir anlik goruntu alir. */
  _snapshot() {
    return JSON.parse(JSON.stringify(this.state));
  }

  _push() {
    this.history.push(this._snapshot());
  }

  get canGoBack() {
    return this.history.length > 0;
  }

  back() {
    if (!this.canGoBack) return false;
    this.state = this.history.pop();
    return true;
  }

  get tracer() {
    return this.bundle.tracers.tracers.find((t) => t.id === this.state.tracerId) || null;
  }

  /** Sablonlarda kullanilabilecek tum degerler. */
  get context() {
    const tracer = this.tracer;
    const marker = this.state.code ? resolveMarker(this.bundle, this.state.code, this.state.tracerId) : this.bundle.tumorMarkers.default;
    return {
      code: this.state.code || '',
      codeLabel: this.state.codeEntry?.label || '',
      tracer: tracer?.label || '',
      tracerCode: tracer?.sutCode || '',
      tracerId: this.state.tracerId,
      facilityId: this.state.facilityId,
      params: this.state.params,
      marker: { label: marker.label, list: (marker.markers || []).join(', ') },
    };
  }

  _node(nodeId) {
    const node = this.bundle.rules.nodes.find((n) => n.id === nodeId);
    if (!node) throw new Error(`Tanimsiz dugum: ${nodeId}`);
    return node;
  }

  /**
   * Ekranda gosterilecek her seyi cozulmus halde dondurur.
   * app.js bu yapiyi dogrudan cizer; hicbir klinik karar UI katmaninda verilmez.
   */
  currentView() {
    if (this.state.outcome) return { kind: 'result', ...this.state.outcome, code: this.state.code, codeEntry: this.state.codeEntry, warnings: this.state.warnings, trail: this.state.trail };
    if (this.state.nodeId === '__icd__') {
      const tracer = this.tracer;
      return {
        kind: 'icd',
        tracer,
        prompt: tracer.icdPrompt || 'ICD-10 kodunu girin',
        quickPicks: (this.bundle.quickPicks.byTracer[tracer.id] || []),
        trail: this.state.trail,
      };
    }

    const node = this._node(this.state.nodeId);
    const ctx = this.context;
    const rawOptions = node.optionsFrom === 'tracers' ? tracerOptions(this.bundle) : node.options;
    const options = rawOptions
      .filter((opt) => evaluatePredicate(opt.visibleWhen, ctx))
      .map((opt) => ({
        id: opt.id,
        label: renderTemplate(opt.label, ctx),
        note: opt.note ? renderTemplate(opt.note, ctx) : null,
        icon: opt.icon || 'chevron',
        tone: opt.tone || 'neutral',
      }));

    return {
      kind: 'question',
      nodeId: node.id,
      question: renderTemplate(node.question, ctx),
      hint: node.hint ? renderTemplate(node.hint, ctx) : null,
      options,
      trail: this.state.trail,
    };
  }

  /** Bir sonucu sablonlari cozerek duruma yazar. */
  _applyOutcome(outcome) {
    const ctx = this.context;
    this.state.outcome = {
      status: outcome.status,
      indication: outcome.indication ? renderTemplate(outcome.indication, ctx) : null,
      reason: outcome.reason ? renderTemplate(outcome.reason, ctx) : null,
      sutRefs: (outcome.sutRefs || []).map((id) => this.bundle.meta.regulation.relevantSections.find((s) => s.id === id) || { id, label: id }),
    };
  }

  /** `next` alanini (dizge veya {node, params}) cozup duruma uygular. */
  _goto(next) {
    if (typeof next === 'string') {
      this.state.nodeId = next;
      this.state.params = {};
      return;
    }
    this.state.nodeId = next.node;
    const ctx = this.context;
    this.state.params = Object.fromEntries(
      Object.entries(next.params || {}).map(([k, v]) => [k, renderTemplate(v, ctx)]),
    );
  }

  /** Kullanicinin secimini isler. */
  choose(optionId) {
    const node = this._node(this.state.nodeId);
    this._push();

    if (node.optionsFrom === 'tracers') {
      const option = tracerOptions(this.bundle).find((o) => o.id === optionId);
      if (!option) throw new Error(`Tanimsiz secenek: ${optionId}`);
      const tracer = option._tracer;
      this.state.tracerId = tracer.id;
      this.state.trail.push(chipLabel(tracer.label));
      if (!tracer.covered) {
        this._applyOutcome(tracer.notCoveredOutcome);
      } else if (tracer.askIcd) {
        this.state.nodeId = '__icd__';
      } else {
        this._goto(tracer.entryNode);
      }
      return this.currentView();
    }

    const ctx = this.context;
    const option = (node.options || [])
      .filter((o) => evaluatePredicate(o.visibleWhen, ctx))
      .find((o) => o.id === optionId);
    if (!option) throw new Error(`Tanimsiz veya gorunur olmayan secenek: ${node.id}/${optionId}`);

    this.state.trail.push(chipLabel(renderTemplate(option.label, ctx)));
    if (option.setsFacility) this.state.facilityId = option.setsFacility;

    if (option.outcome) {
      this._applyOutcome(option.outcome);
    } else if (option.branch) {
      const freshCtx = this.context;
      const arm = option.branch.find((b) => evaluatePredicate(b.when, freshCtx));
      if (!arm) throw new Error(`Dallanmada eslesen kol yok: ${node.id}/${optionId}`);
      if (arm.outcome) this._applyOutcome(arm.outcome);
      else this._goto(arm.next);
    } else if (option.next) {
      this._goto(option.next);
    } else {
      throw new Error(`Secenegin sonucu yok: ${node.id}/${optionId}`);
    }
    return this.currentView();
  }

  /**
   * ICD kodunu dogrular ve akisa devam eder.
   * Basarisizlik durumunda {ok:false, error} doner; durum degismez.
   */
  submitIcd(raw) {
    const code = normalizeIcd(raw);
    if (!code) return { ok: false, error: 'Lutfen bir ICD-10 kodu girin.' };
    if (!isWellFormedIcd(code)) {
      return { ok: false, error: `"${code}" gecerli bir ICD-10 kodu bicimine benzemiyor. Ornek: C34, C50.9, E21.0` };
    }

    const tracer = this.tracer;
    const { set, entry, matched } = matchCode(this.bundle, tracer.codeSet, code);

    this._push();
    this.state.code = code;
    this.state.codeEntry = entry;
    this.state.trail.push(`ICD: ${code}`);
    this.state.warnings = [];

    if (!matched && set.enforcement === 'block') {
      this._applyOutcome({
        status: 'not-covered',
        reason: renderTemplate(set.rejectionMessage, { code }),
        sutRefs: set.sutRef ? [set.sutRef] : [],
      });
      return { ok: true, view: this.currentView() };
    }

    if (!matched && set.enforcement === 'warn') {
      this.state.warnings.push(renderTemplate(set.warningMessage, { code }));
    }
    if (entry && entry.status && entry.status !== 'active') {
      this.state.warnings.push(
        entry.status === 'needs-review'
          ? `${entry.code} kodu dogrulanmayi bekliyor: ${entry.reviewNote || 'ayrinti icin docs/duzeltmeler.md'}`
          : `${entry.code} kodu ekip onerisi olarak eklendi: ${entry.reviewNote || 'ayrinti icin docs/duzeltmeler.md'}`,
      );
    }

    this._goto(tracer.entryNode);
    return { ok: true, view: this.currentView() };
  }
}

/** Veri dosyalarini tek bir pakete toplar ve butunlugunu dogrular. */
export function createBundle(parts) {
  const bundle = {
    meta: parts.meta,
    rules: parts.rules,
    tracers: parts.tracers,
    codeSets: parts.codeSets,
    tumorMarkers: parts.tumorMarkers,
    quickPicks: parts.quickPicks,
    generatedAt: parts.generatedAt || null,
  };
  return bundle;
}
