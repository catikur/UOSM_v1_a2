/**
 * JSON Schema'nin kucuk bir alt kumesini dogrulayan bagimsiz dogrulayici.
 *
 * Neden tam bir kutuphane degil: proje sifir uretim/gelistirme bagimliligiyla
 * calissin isteniyor. Desteklenen anahtar kelimeler asagida; desteklenmeyen bir
 * anahtar kelime gorulurse SESSIZ GECILMEZ, hata firlatilir (sema yazarken
 * yanlis guven olusmasin diye).
 */
const SUPPORTED = new Set([
  '$schema', '$id', 'title', 'description', 'type', 'properties', 'required',
  'items', 'enum', 'pattern', 'minItems', 'minimum', 'additionalProperties',
  'oneOf', 'anyOf', 'const', 'nullable', 'patternProperties', 'examples',
]);

const typeOf = (value) => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

function assertSupported(schema, path) {
  for (const key of Object.keys(schema)) {
    if (!SUPPORTED.has(key)) throw new Error(`Sema hatasi (${path}): desteklenmeyen anahtar kelime "${key}"`);
  }
}

export function validate(value, schema, path = '$', errors = []) {
  assertSupported(schema, path);

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path}: "${schema.const}" olmali, "${value}" bulundu`);
    return errors;
  }

  if (schema.nullable && value === null) return errors;

  if (schema.oneOf || schema.anyOf) {
    const branches = schema.oneOf || schema.anyOf;
    const matched = branches.some((branch) => validate(value, branch, path, []).length === 0);
    if (!matched) errors.push(`${path}: hicbir alternatif semayla eslesmedi`);
    return errors;
  }

  if (schema.type) {
    const types = [].concat(schema.type);
    if (!types.includes(typeOf(value))) {
      errors.push(`${path}: tur "${types.join('|')}" olmali, "${typeOf(value)}" bulundu`);
      return errors;
    }
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: "${value}" gecerli degil (izinli: ${schema.enum.join(', ')})`);
  }

  if (schema.pattern && typeof value === 'string' && !new RegExp(schema.pattern).test(value)) {
    errors.push(`${path}: "${value}" /${schema.pattern}/ bicimine uymuyor`);
  }

  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) {
    errors.push(`${path}: en az ${schema.minimum} olmali`);
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path}: en az ${schema.minItems} oge icermeli`);
    }
    if (schema.items) value.forEach((item, i) => validate(item, schema.items, `${path}[${i}]`, errors));
  }

  if (typeOf(value) === 'object') {
    for (const key of schema.required || []) {
      if (!(key in value)) errors.push(`${path}: zorunlu alan eksik -> "${key}"`);
    }
    const known = new Set(Object.keys(schema.properties || {}));
    for (const [key, child] of Object.entries(value)) {
      if (schema.properties?.[key]) {
        validate(child, schema.properties[key], `${path}.${key}`, errors);
        continue;
      }
      const patternMatch = Object.entries(schema.patternProperties || {})
        .find(([pattern]) => new RegExp(pattern).test(key));
      if (patternMatch) {
        validate(child, patternMatch[1], `${path}.${key}`, errors);
        continue;
      }
      if (schema.additionalProperties === false && !known.has(key) && key !== '$schema') {
        errors.push(`${path}: tanimsiz alan -> "${key}"`);
      }
    }
  }

  return errors;
}
