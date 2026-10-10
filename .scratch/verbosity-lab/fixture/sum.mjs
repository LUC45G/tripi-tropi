export function sum(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b)) throw new TypeError('Integers required');
  return a + b;
}
