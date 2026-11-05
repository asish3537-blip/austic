import assert from 'node:assert/strict';
import { guidedHelp, helpLinks } from '../lib/assistant-guides';
import { test } from 'node:test';
test('role links never expose another role workspace', () => {
  for (const role of ['CUSTOMER','MOTHER','DELIVERY_AGENT','GUEST'] as const) {
    assert(!helpLinks(role).some(link => link.href.startsWith('/admin')));
  }
  assert(helpLinks('ADMIN').some(link => link.href === '/admin/test-evidence'));
});
test('cancellation and subscription guidance preserves booking rules', () => {
  assert.match(guidedHelp('cancel my meal','CUSTOMER').reply,/five hours/);
  assert.match(guidedHelp('reserve meal days','CUSTOMER').reply,/3–7 different/);
});
test('wallet and courier guidance distinguishes simulation and actual delivery', () => {
  assert.match(guidedHelp('add wallet money','CUSTOMER').reply,/non-cash test funds/);
  assert.match(guidedHelp('delivery GPS','DELIVERY_AGENT').reply,/assigned delivery is active/);
});
test('unknown requests remain guidance without fabricated actions', () => {
  const answer = guidedHelp('delete all records now','ADMIN');
  assert.equal(answer.mode,'guided');
  assert.match(answer.reply,/does not read private records or perform account actions/);
});
