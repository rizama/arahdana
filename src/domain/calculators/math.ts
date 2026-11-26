export function fv(pv: number, payment: number, rate: number, periods: number, begin = true): number {
  const power = (1 + rate) ** periods;
  // Avoid cancellation to zero for valid rates below machine precision.
  if (rate && power === 1) return pv * Math.exp(periods * Math.log1p(rate)) + payment * Math.expm1(periods * Math.log1p(rate)) / rate * (begin ? 1 + rate : 1);
  return pv * power + payment * (rate ? (power - 1) / rate * (begin ? 1 + rate : 1) : periods);
}

// Round the exact IEEE-754 value, including decimal ties, as Python round does.
export function pythonRound(value: number, digits = 0): number {
  if (!Number.isFinite(value)) throw new RangeError('Non-finite result');
  const buffer = new DataView(new ArrayBuffer(8));
  buffer.setFloat64(0, Math.abs(value));
  const bits = buffer.getBigUint64(0);
  const exponent = Number((bits >> 52n) & 2047n);
  const mantissa = (bits & ((1n << 52n) - 1n)) + (exponent ? 1n << 52n : 0n);
  const shift = (exponent ? exponent - 1023 : -1022) - 52;
  let numerator = mantissa * 10n ** BigInt(Math.max(0, digits));
  let denominator = 10n ** BigInt(Math.max(0, -digits));
  if (shift >= 0) numerator <<= BigInt(shift); else denominator <<= BigInt(-shift);
  let quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder * 2n > denominator || (remainder * 2n === denominator && quotient % 2n)) quotient++;
  return Math.sign(value) * Number(quotient) / 10 ** digits;
}
export function composition(initial: number, payment: number, periods: number, value: number) {
  const principal = initial + payment * periods;
  const percent = value > 0 ? principal / value * 100 : principal ? 100 : 0;
  return { principal, interest_earned: value - principal, principal_percent: percent, interest_percent: value > 0 ? 100 - percent : 0 };
}
