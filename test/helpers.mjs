import { loadBundle } from '../scripts/lib/data.mjs';
import { createBundle, Wizard } from '../src/engine.js';

export const bundle = createBundle(loadBundle());
export const newWizard = () => new Wizard(bundle);

/** Bir adim dizisini uygular: dizge -> secenek kimligi, {icd} -> kod girisi. */
export function walk(steps) {
  const wizard = newWizard();
  for (const step of steps) {
    if (typeof step === 'object' && 'icd' in step) {
      const result = wizard.submitIcd(step.icd);
      if (!result.ok) throw new Error(`ICD reddedildi: ${result.error}`);
    } else {
      wizard.choose(step);
    }
  }
  return { wizard, view: wizard.currentView() };
}

/** Yurunen yol boyunca gorulen soru dugumlerinin kimliklerini toplar. */
export function trace(steps) {
  const wizard = newWizard();
  const seen = [];
  for (const step of steps) {
    const view = wizard.currentView();
    if (view.kind === 'question') seen.push(view.nodeId);
    if (typeof step === 'object' && 'icd' in step) wizard.submitIcd(step.icd);
    else wizard.choose(step);
  }
  const last = wizard.currentView();
  if (last.kind === 'question') seen.push(last.nodeId);
  return { seen, view: last, wizard };
}
