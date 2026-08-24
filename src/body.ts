type BodyScalar = string | number | boolean | null | undefined;
type BodyValue = BodyScalar | BodyScalar[];

export type BodyParams = Record<string, BodyValue | Record<string, BodyValue>>;

const unsafePathSegments = new Set(['__proto__', 'constructor', 'prototype']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createBodyObject(): Record<string, unknown> {
  return Object.create(null) as Record<string, unknown>;
}

// The BillingServ API (Laravel) reads parallel-array fields like cycle.cycle or record.item
// as nested structures, so dotted keys must be sent as {"cycle": {"cycle": [...]}} in JSON.
export function expandDottedKeys(body: BodyParams): Record<string, unknown> {
  const result = createBodyObject();

  for (const [key, value] of Object.entries(body)) {
    const parts = key.split('.').filter((part) => part !== '');

    if (parts.length === 0) {
      continue;
    }

    const unsafePart = parts.find((part) => unsafePathSegments.has(part));

    if (unsafePart) {
      throw new Error(`Unsafe body parameter path segment: ${unsafePart}`);
    }

    let target = result;

    for (const part of parts.slice(0, -1)) {
      const existing = Object.hasOwn(target, part) ? target[part] : undefined;

      if (!isPlainObject(existing)) {
        target[part] = createBodyObject();
      }

      target = target[part] as Record<string, unknown>;
    }

    const leaf = parts[parts.length - 1];
    const existing = Object.hasOwn(target, leaf) ? target[leaf] : undefined;

    if (isPlainObject(value) && isPlainObject(existing)) {
      Object.assign(existing, value);
    } else {
      target[leaf] = value;
    }
  }

  return result;
}
