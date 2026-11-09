// WhatsApp Web may emit an acknowledgement even when sendMessage returns null.
// A timeout is ambiguous: callers must stop rather than blindly resend.
export function sendWithAck(client, groupId, text, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = error => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      client.off('message_ack', onAck);
      error ? reject(error) : resolve();
    };
    const onAck = (message, ack) => {
      if (message?.to === groupId && message?.body === text && Number(ack) >= 1) finish();
    };
    const timer = setTimeout(() => finish(new Error('Delivery unconfirmed; manual check required')), timeoutMs);
    client.on('message_ack', onAck);
    Promise.resolve().then(() => client.sendMessage(groupId,text)).catch(() => finish(new Error('Send failed or is uncertain; manual check required')));
  });
}
