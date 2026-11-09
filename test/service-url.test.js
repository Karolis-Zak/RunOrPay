import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateServiceUrl} from '../whatsapp/service-url.js';
test('allows local HTTP or remote HTTPS without embedded credentials', () => {
  assert.equal(validateServiceUrl('http://127.0.0.1:8787').hostname, '127.0.0.1');
  assert.equal(validateServiceUrl('https://example.com').hostname, 'example.com');
  assert.throws(() => validateServiceUrl('http://example.com'));
  assert.throws(() => validateServiceUrl('https://user:pass@example.com'));
});
