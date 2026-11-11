import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validAmount, scientific, compareAmounts, addAmounts, subtractAmounts, multiplyAmounts, divideAmounts, powerAmount, amountRatio, canAfford} from '../src/numbers.mjs';

test('ordinary amounts retain native arithmetic and prices ignore accumulation noise', () => {
  assert.equal(addAmounts(10, 15), 25);
  assert.equal(subtractAmounts(25, 10), 15);
  assert.equal(subtractAmounts(10, 25), 0);
  assert.equal(multiplyAmounts(6, 2), 12);
  assert.equal(divideAmounts(18, 3), 6);
  assert.equal(canAfford(9.999999999999997e219, 1e220), true);
  assert.equal(canAfford(9.999e219, 1e220), false);
});

test('amounts cross native-number limits with arithmetic and JSON round trips', () => {
  const huge = scientific(5, 10000);
  const triple = multiplyAmounts(huge, 3);
  assert.equal(compareAmounts(triple, huge), 1);
  assert.ok(Math.abs(amountRatio(triple, huge) - 3) < 1e-12);
  assert.deepEqual(subtractAmounts(addAmounts(huge, huge), huge), huge);
  assert.equal(subtractAmounts(huge, huge), 0);
  assert.equal(amountRatio(scientific(1, 9000), huge), 0);
  assert.equal(validAmount(JSON.parse(JSON.stringify(triple))), true);
  assert.equal(compareAmounts(powerAmount(2, 50000), huge), 1);
  assert.equal(validAmount(multiplyAmounts(Number.MAX_VALUE, Number.MAX_VALUE)), true);
  assert.equal(compareAmounts(addAmounts(9e199, 9e199), 1e200), 1);
});

test('invalid serialized amounts cannot enter a save', () => {
  for (const value of [null, NaN, Infinity, -1, {}, {mantissa:0,exponent:999}, {mantissa:10,exponent:999}, {mantissa:2,exponent:Infinity}, {mantissa:2,exponent:2.5}]) {
    assert.equal(validAmount(value), false);
  }
  assert.throws(() => divideAmounts(1, 0), RangeError);
});
