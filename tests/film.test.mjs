import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEconomy, withStartingMoney, purchaseGear, balance, accountBalance } from '../src/economy.ts';
import { freshStory, settleDays } from '../src/story.ts';
import { filmFrames, spareRolls, reloadFilm, exposeFilm, buyFilm, normalizeFilm, usesFilm } from '../src/film.ts';

test('a gifted roll permits exactly 24 photographs and empty rolls reject captures', () => {
  let kit = normalizeEconomy(undefined, []);
  for (let i = 0; i < 24; i++) { kit = exposeFilm(kit); assert.equal(filmFrames(kit), 23 - i); }
  assert.equal(exposeFilm(kit), null);
  assert.equal(buyFilm(kit, []).ok, false);
  const loan = buyFilm(kit, [], true);
  assert.equal(loan.ok, true); assert.equal(filmFrames(loan.economy), 24);
  assert.equal(balance(loan.economy, []), 0); assert.equal(accountBalance(loan.economy, []), -12);
  assert.equal(buyFilm(loan.economy, [], true).ok, false);
  assert.equal(balance(loan.economy, ['nature-1']), 108, 'future commissions pay the tab');
});
test('replacement film spends the shared wallet and reload keeps inventory, debt and previously bought gear', () => {
  const completed = ['nature-1'];
  let kit = purchaseGear(normalizeEconomy(undefined, completed), completed, 'zoom').economy;
  kit = { ...kit, film: { frames: 0, costs: 0 } };
  kit = buyFilm(kit, completed, true).economy;
  kit = exposeFilm(kit);
  assert.deepEqual(normalizeEconomy(JSON.parse(JSON.stringify(kit)), completed), kit);
  assert.equal(accountBalance(kit, completed), -12);
  const paid = buyFilm({ ...normalizeEconomy(undefined, completed), film: { frames: 0, costs: 0 } }, completed);
  assert.equal(paid.ok, true); assert.equal(balance(paid.economy, completed), 108);
  assert.equal(purchaseGear(paid.economy, completed, 'zoom').ok, false);
});
test('digital ownership removes film use in single and burst modes without erasing the tab', () => {
  const kit = { ...normalizeEconomy(undefined, []), gifted: ['burst'], film: { frames: 0, costs: 12 } };
  for (const burstEnabled of [false, true]) {
    const digital = { ...kit, burstEnabled };
    assert.equal(usesFilm(digital), false); assert.deepEqual(exposeFilm(digital), digital);
    assert.equal(buyFilm(digital, [], true).ok, false);
    assert.equal(accountBalance(digital, []), -12);
  }
});
test('film inventory and costs reject malformed values and remain bounded across saves', () => {
  assert.deepEqual(normalizeFilm({frames:-4,costs:NaN}), {frames:0,costs:0});
  assert.deepEqual(normalizeFilm({frames:Infinity,costs:-3}), {frames:24,costs:0});
  assert.deepEqual(normalizeFilm({frames:999,costs:9.8}), {frames:24,costs:9});
});

test('exhibition income repays emergency film before rent without blocking time or removing equipment', () => {
  const economy = { ...normalizeEconomy(undefined, []), film: { frames: 24, costs: 12 } };
  const result = settleDays({ ...freshStory(), cameraReceived:true, deerShown:true, exhibition:true }, economy, [], 3);
  assert.equal(result.income, 15); assert.equal(result.rent, 3);
  assert.equal(balance(result.economy, []), 0); assert.equal(accountBalance(result.economy, []), 0);
  assert.equal(result.story.rentArrears, 3); assert.equal(result.story.day, 4);
  assert.equal(filmFrames(result.economy), 24);
});

test('starting money is a single saved credit and funds a spare roll before any commission', () => {
  let kit = withStartingMoney(normalizeEconomy(undefined, []));
  assert.equal(balance(kit, []), 20);
  kit = buyFilm(kit, []).economy;
  assert.equal(balance(kit, []), 8);
  assert.equal(filmFrames(kit), 24); assert.equal(spareRolls(kit), 1);
  for (let i = 0; i < 3; i++) kit = withStartingMoney(normalizeEconomy(JSON.parse(JSON.stringify(kit)), []));
  assert.equal(balance(kit, []), 8, 'reloads and migrations cannot regrant spent cash');
  assert.equal(buyFilm(kit, [], true).ok, false, 'credit cannot stockpile spare rolls');
});
test('spare purchases preserve the partially exposed roll and reload uses one spare without charging', () => {
  const completed = ['nature-1'];
  let kit = { ...normalizeEconomy(undefined, completed), film: { frames: 2, rolls: 0, costs: 0 } };
  kit = buyFilm(kit, completed).economy; kit = buyFilm(kit, completed).economy;
  assert.equal(filmFrames(kit), 2); assert.equal(spareRolls(kit), 2);
  assert.equal(reloadFilm(kit), null, 'a partial roll cannot be thrown away');
  kit = exposeFilm(exposeFilm(kit));
  assert.equal(filmFrames(kit), 0); assert.equal(spareRolls(kit), 2);
  const reloaded = reloadFilm(kit);
  assert.equal(filmFrames(reloaded), 24); assert.equal(spareRolls(reloaded), 1);
  assert.equal(balance(reloaded, completed), 96);
  assert.deepEqual(normalizeEconomy(JSON.parse(JSON.stringify(reloaded)), completed), reloaded);
  assert.equal(reloadFilm({ ...reloaded, gifted: ['burst'] }), null);
  assert.equal(reloadFilm({ ...kit, film: { ...kit.film, rolls: 0 } }), null);
});
test('legacy film saves have no spares and malformed spare counts stay bounded', () => {
  assert.equal(spareRolls(normalizeEconomy({film:{frames:5,costs:12}}, [])), 0);
  assert.equal(normalizeFilm({frames:7,rolls:-1,costs:12}).rolls, 0);
  assert.equal(normalizeFilm({rolls:Infinity}).rolls, 0);
  assert.equal(normalizeFilm({rolls:10000}).rolls, 999);
  assert.equal(normalizeFilm({rolls:2.7}).rolls, 2);
});
