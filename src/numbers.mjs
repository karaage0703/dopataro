// Amounts use ordinary numbers below 1e200 and scientific notation above it.
// The mantissa has Number precision; the exponent extends the playable range.
export function validAmount(value) {
  return typeof value === 'number'
    ? Number.isFinite(value) && value >= 0
    : value !== null && typeof value === 'object'
      && Number.isFinite(value.mantissa) && value.mantissa >= 1 && value.mantissa < 10
      && Number.isSafeInteger(value.exponent) && value.exponent >= 200;
}

export function scientific(mantissa, exponent = 0) {
  if (!Number.isFinite(mantissa) || mantissa < 0 || !Number.isSafeInteger(exponent)) {
    throw new RangeError('Invalid amount');
  }
  if (mantissa === 0) return 0;
  const shift = Math.max(-323, Math.floor(Math.log10(mantissa)));
  mantissa /= 10 ** shift;
  exponent += shift;
  if (mantissa >= 10) { mantissa /= 10; exponent++; }
  if (mantissa < 1) { mantissa *= 10; exponent--; }
  if (!Number.isSafeInteger(exponent)) throw new RangeError('Amount exponent overflow');
  if (exponent < -308) return mantissa * 10 ** (exponent + 1) / 10;
  return exponent < 200 ? mantissa * 10 ** exponent : {mantissa, exponent};
}

function parts(value) {
  if (typeof value === 'object') return [value.mantissa, value.exponent];
  if (value === 0) return [0, 0];
  const exponent = Math.max(-323, Math.floor(Math.log10(value)));
  return [value / 10 ** exponent, exponent];
}

export function compareAmounts(left, right) {
  if (typeof left === 'number' && typeof right === 'number') return Math.sign(left - right);
  if (left === 0) return right === 0 ? 0 : -1;
  if (right === 0) return 1;
  const [lm, le] = parts(left), [rm, re] = parts(right);
  return Math.sign(le - re) || Math.sign(lm - rm);
}

export function addAmounts(left, right) {
  if (typeof left === 'number' && typeof right === 'number' && left + right < 1e200) return left + right;
  if (left === 0) return right;
  if (right === 0) return left;
  const [lm, le] = parts(left), [rm, re] = parts(right);
  const exponent = Math.max(le, re);
  return scientific(lm * 10 ** (le - exponent) + rm * 10 ** (re - exponent), exponent);
}

// Amounts such as HP and money are nonnegative; subtraction clamps at zero.
export function subtractAmounts(left, right) {
  if (compareAmounts(left, right) <= 0) return 0;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  const [lm, le] = parts(left), [rm, re] = parts(right);
  return scientific(Math.max(0, lm - rm * 10 ** (re - le)), le);
}

export function multiplyAmounts(left, right) {
  if (left === 0 || right === 0) return 0;
  if (typeof left === 'number' && typeof right === 'number' && left * right < 1e200) return left * right;
  const [lm, le] = parts(left), [rm, re] = parts(right);
  return scientific(lm * rm, le + re);
}

export function divideAmounts(left, right) {
  if (right === 0) throw new RangeError('Division by zero');
  if (left === 0) return 0;
  if (typeof left === 'number' && typeof right === 'number' && left / right < 1e200) return left / right;
  const [lm, le] = parts(left), [rm, re] = parts(right);
  return scientific(lm / rm, le - re);
}

export function powerAmount(base, exponent) {
  const logarithm = Math.log10(base) * exponent;
  if (logarithm < 200) return base ** exponent;
  const whole = Math.floor(logarithm);
  return scientific(10 ** (logarithm - whole), whole);
}

export function amountLog10(value) {
  if (typeof value === 'number') return Math.log10(value);
  return value.exponent + Math.log10(value.mantissa);
}

// Ratios used for bars and upgrade feedback are deliberately ordinary numbers.
export function amountRatio(left, right) {
  const result = divideAmounts(left, right);
  return typeof result === 'number' ? result : Number.MAX_VALUE;
}

export const minAmount = (left, right) => compareAmounts(left, right) <= 0 ? left : right;
export const maxAmount = (left, right) => compareAmounts(left, right) >= 0 ? left : right;
export const sumAmounts = values => values.reduce(addAmounts, 0);

// Ignore only floating-point accumulation noise, never a visible price shortfall.
export const canAfford = (money, price) => compareAmounts(money, price) >= 0 || amountRatio(money, price) >= 1 - 1e-14;
