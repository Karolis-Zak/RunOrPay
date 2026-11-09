import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreWeek } from '../src/scoring.js';

test('multiple runs meet targets and both pass', () => {
  const result = scoreWeek([{runner:'Karolis',id:'1',metres:3200},{runner:'Karolis',id:'2',metres:6800},{runner:'Lorenas',id:'3',metres:5000}], {Karolis:true,Lorenas:true});
  assert.equal(result.results.Karolis.status, 'pass');
  assert.deepEqual(result.settlement, {pounds:0});
});
test('one metre short incurs a debt, two failures cancel', () => {
  assert.deepEqual(scoreWeek([{runner:'Karolis',id:'1',metres:9999},{runner:'Lorenas',id:'2',metres:5000}], {Karolis:true,Lorenas:true}).settlement, {debtor:'Karolis',creditor:'Lorenas',pounds:50});
  assert.deepEqual(scoreWeek([], {Karolis:true,Lorenas:true}).settlement, {pounds:0});
});
test('unverified information never creates a settlement', () => {
  assert.equal(scoreWeek([], {Karolis:true}).settlement, null);
});
test('duplicate activities are rejected', () => {
  const activity = {runner:'Karolis',id:'1',metres:1000};
  assert.throws(() => scoreWeek([activity, activity]), /Duplicate/);
});
