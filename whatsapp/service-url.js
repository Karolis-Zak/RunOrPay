export function validateServiceUrl(value) {
  const url = new URL(value);
  const isLoopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback))) throw new Error('Use HTTPS or HTTP on localhost only');
  return url;
}
