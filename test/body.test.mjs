import assert from 'node:assert/strict';
import test from 'node:test';

import { expandDottedKeys } from '../dist/body.js';

test('expands legitimate dotted body parameters', () => {
  const expanded = expandDottedKeys({
    cycle: { cycle: [5] },
    'cycle.price': [10],
    'cycle.setup': [0],
    'record.item': ['Managed hosting'],
    constructor_name: 'Example Ltd',
    prototype_version: '1.0'
  });

  assert.deepEqual(JSON.parse(JSON.stringify(expanded)), {
    cycle: {
      cycle: [5],
      price: [10],
      setup: [0]
    },
    record: {
      item: ['Managed hosting']
    },
    constructor_name: 'Example Ltd',
    prototype_version: '1.0'
  });
});

test('rejects prototype-sensitive dotted path segments', () => {
  const maliciousKeys = [
    '__proto__',
    '__proto__.polluted',
    'safe.__proto__.polluted',
    'safe..__proto__.polluted',
    'constructor',
    'constructor.prototype.polluted',
    'prototype',
    'safe.prototype.polluted'
  ];

  for (const key of maliciousKeys) {
    assert.throws(
      () => expandDottedKeys({ [key]: true }),
      /Unsafe body parameter path segment/
    );
  }

  assert.equal(Object.prototype.polluted, undefined);
});
