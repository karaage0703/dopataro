import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fresh, restore, maxHP, tapPower, swordCost, allyCost, allyPower, buy, damage, reward, prepareCombat, parry, autoRebirth, fmt, soulGain} from '../src/engine.mjs';
import {scientific, validAmount, compareAmounts, multiplyAmounts, amountRatio, canAfford} from '../src/numbers.mjs';

function legacyCappedSave() {
  return {...fresh(), version:5, stage:300, best:300, rebirths:2, souls:1546, sword:500,
    allies:[400,450,500], cycleScale:1e218, coins:1e220, total:1e220, hp:1e220};
}

test('old saturated progress migrates without raising the current enemy difficulty', () => {
  const previous = legacyCappedSave();
  const s = restore(JSON.stringify(previous));
  assert.equal(s.version, 6);
  for (const key of ['stage','best','rebirths','souls','sword','coins','total']) assert.equal(s[key], previous[key]);
  assert.deepEqual(s.allies, previous.allies);
  assert.ok(Math.abs(amountRatio(maxHP(s), 1e220) - 1) < 1e-12);
  assert.ok(compareAmounts(tapPower(s), 1e220) > 0);
  const saved = restore(JSON.stringify(s));
  assert.deepEqual(saved, s);
});

test('weapon and companion upgrades above the former cap increase power and spend the real price', () => {
  const s = restore(JSON.stringify(legacyCappedSave()));
  for (const level of [500, 504, 700, 999, 1000, 10000]) {
    s.sword = level;
    const price = swordCost(s), before = tapPower(s);
    s.coins = price;
    assert.equal(buy(s, 'sword'), true);
    assert.equal(s.coins, 0);
    assert.ok(Math.abs(amountRatio(tapPower(s), before) - (level % 5 === 4 ? 20 : 2)) < 1e-10);
    assert.equal(restore(JSON.stringify(s)).sword, level + 1);
  }
  s.sword = 500;
  s.allies[0] = 1000;
  const before = allyPower(s, 0);
  s.coins = allyCost(s, 0);
  assert.equal(buy(s, 'ally', 0), true);
  assert.equal(s.coins, 0);
  assert.equal(compareAmounts(allyPower(s, 0), before), 1);
  s.coins = multiplyAmounts(swordCost(s), .99);
  const frozen = JSON.stringify(s);
  assert.equal(buy(s, 'sword'), false);
  assert.equal(JSON.stringify(s), frozen);
});

test('huge swarm damage, partial saves, boss seals and rewards remain usable', () => {
  const s = fresh();
  s.stage = 300; s.cycleScale = scientific(2, 1000); s.hp = maxHP(s);
  prepareCombat(s);
  const expectedLoot = reward(s);
  const hp = maxHP(s);
  assert.equal(damage(s, multiplyAmounts(hp, 10)), null);
  assert.ok(Math.abs(amountRatio(s.hp, hp) - .4) < 1e-12);
  const saved = restore(JSON.stringify(s));
  assert.deepEqual(saved.mobHP, s.mobHP);
  assert.ok(validAmount(saved.hp));
  // Re-prepare the boss exactly as a reloaded game does, then resolve the seal.
  prepareCombat(saved); saved.windup = .4;
  assert.equal(parry(saved), true);
  const result = damage(saved, multiplyAmounts(hp, 10));
  assert.equal(result.cleared, 300);
  assert.ok(Math.abs(amountRatio(saved.coins, expectedLoot) - 1) < 1e-12);
  assert.equal(saved.stage, 301);
  assert.ok(compareAmounts(saved.hp, 1e308) > 0);
  assert.doesNotMatch(fmt(saved.coins), /NaN|Infinity/);
});

test('ten complete cycles keep growing through combat, purchases, saves and automatic rebirth', () => {
  let s = fresh();
  let previousPower = 0;
  for (let cycle = 0; cycle < 10; cycle++) {
    for (let wave = 1; wave <= 500; wave++) {
      assert.equal(s.stage, wave);
      prepareCombat(s);
      if (s.bossSeal) { s.windup = .4; assert.equal(parry(s), true); }
      // Accelerated combat uses legal damage, while rewards fund all purchases.
      const result = damage(s, maxHP(s));
      assert.equal(result.cleared, wave);
      while (canAfford(s.coins, swordCost(s))) assert.equal(buy(s, 'sword'), true);
      for (let i = 0; i < 3; i++) if (canAfford(s.coins, allyCost(s, i))) assert.equal(buy(s, 'ally', i), true);
      assert.ok(validAmount(s.coins));
      assert.ok(validAmount(tapPower(s)));
    }
    const oldLevel = s.sword, oldCoins = s.coins, oldPower = tapPower(s), expectedSouls = s.souls + soulGain(s);
    assert.ok(compareAmounts(oldPower, previousPower) > 0);
    assert.equal(autoRebirth(s), true);
    assert.equal(s.sword, oldLevel);
    assert.deepEqual(s.coins, oldCoins);
    assert.equal(s.souls, expectedSouls);
    assert.equal(s.stage, 1);
    previousPower = oldPower;
    s = restore(JSON.stringify(s));
  }
  assert.ok(compareAmounts(tapPower(s), 1e308) > 0);
  assert.ok(s.sword > 700);
  console.log('10-cycle simulation', {sword:s.sword, power:fmt(tapPower(s)), money:fmt(s.coins)});
});

test('malformed new saves and every legacy version restore safely', () => {
  for (let version = 1; version <= 6; version++) {
    const saved = {...fresh(),version,sword:25,allies:[2,3,4],coins:12345};
    assert.equal(restore(JSON.stringify(saved)).coins, 12345);
  }
  const invalid = {...fresh(), coins:{mantissa:2,exponent:'oops'},cycleScale:{mantissa:10,exponent:999},hp:{mantissa:2,exponent:1.5}};
  const restored = restore(JSON.stringify(invalid));
  assert.equal(restored.coins, 0);
  assert.equal(restored.cycleScale, 1);
  assert.equal(validAmount(restored.hp), true);
  const dead = {...legacyCappedSave(),gameOver:true,teamHP:0};
  assert.equal(restore(JSON.stringify(dead)).gameOver, true);
});
