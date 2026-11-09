import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {sendWithAck} from '../whatsapp/delivery.js';

test('accepts matching acknowledgement even if sendMessage returns null', async () => {
  const client = new EventEmitter();
  client.sendMessage = async (to,body) => { queueMicrotask(() => client.emit('message_ack',{to,body},1)); return null; };
  await sendWithAck(client,'123@g.us','test',100);
  assert.equal(client.listenerCount('message_ack'),0);
});
test('wrong message or pending ack does not count as delivery', async () => {
  const client = new EventEmitter();
  client.sendMessage = async () => { queueMicrotask(() => client.emit('message_ack',{to:'123@g.us',body:'other'},2)); return null; };
  await assert.rejects(sendWithAck(client,'123@g.us','test',5),/unconfirmed/);
});
