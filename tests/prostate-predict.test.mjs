import test from 'node:test';
import assert from 'node:assert/strict';
import { predictProstate } from '../src/lib/prostate-predict.mjs';

const scenario = (age = 65, comorbidity = 0) => ({
  age, comorbidity, psa: 6.2, grade: 2, stage: 2, biopsy: 2,
});
const close = (observed, expected, tolerance = 1e-10) =>
  assert.ok(Math.abs(observed - expected) < tolerance,
    'expected ' + observed + ' to be within ' + tolerance + ' of ' + expected);

test('15-year survival reproduces published case-B reconstruction', () => {
  close(predictProstate(scenario()).alive, 0.5501369676834869);
  close(predictProstate(scenario(), { radical: true }).alive, 0.6390048744989049);
  close(predictProstate(scenario(72, 1)).alive, 0.18091127024278084);
  close(predictProstate(scenario(72, 1), { radical: true }).alive, 0.21953917987997051);
});

test('continuous cause-specific allocation agrees with independent Python quadrature', () => {
  const a = predictProstate(scenario(), { method: 'continuous' });
  close(a.pcDeath, 0.2270856388797735, 4e-5);
  close(a.otherDeath, 0.22277739343673986, 4e-5);
  const b = predictProstate(scenario(72, 1), { radical: true, method: 'continuous' });
  close(b.pcDeath, 0.10009763847476184, 4e-5);
  close(b.otherDeath, 0.6803631816452683, 4e-5);
});

test('legacy source algorithm is distinct but preserves the same survival', () => {
  const c = predictProstate(scenario(), { method: 'continuous' });
  const l = predictProstate(scenario(), { method: 'legacy' });
  close(l.pcDeath, 0.22698410564586677, 1e-10);
  close(l.alive, c.alive, 1e-10);
  assert.ok(Math.abs(l.pcDeath - c.pcDeath) > 5e-5);
});

test('probability partition, monotonic survival, and changing comorbidity', () => {
  for (const age of [40, 52, 65, 72, 85]) {
    for (const method of ['legacy', 'continuous']) {
      let previous = 1;
      for (const years of [1, 5, 10, 15]) {
        const r = predictProstate(scenario(age), { method, years });
        close(r.alive + r.pcDeath + r.otherDeath, 1, 1e-9);
        for (const value of Object.values(r)) assert.ok(value >= 0 && value <= 1);
        assert.ok(r.alive <= previous);
        previous = r.alive;
      }
    }
  }
  const healthy = predictProstate(scenario(72));
  const comorbid = predictProstate(scenario(72, 1));
  assert.ok(comorbid.otherDeath > healthy.otherDeath);
  assert.ok(comorbid.alive < healthy.alive);
});

test('all 12 published Figure 3 survival differences reproduced within 0.085 points', () => {
  const cases = [
    [3.6, 1, 1, 1, [1.7, 1.9, 1.6, 0.9]],
    [6.2, 2, 2, 2, [8.4, 8.9, 7.2, 3.8]],
    [14.0, 2, 3, 2, [11.7, 11.9, 9.3, 5.0]],
  ];
  for (const [psa, stage, grade, biopsy, values] of cases) {
    for (let i = 0; i < 4; i++) {
      const [age, comorbidity] = [[52, 0], [65, 0], [72, 0], [72, 1]][i];
      const patient = { age, comorbidity, psa, grade, stage, biopsy };
      const difference = 100 * (predictProstate(patient, { radical: true }).alive
        - predictProstate(patient).alive);
      assert.ok(Math.abs(difference - values[i]) < .085,
        'published survival-gain vignette mismatch: ' + difference + ' vs ' + values[i]);
    }
  }
});

test('invalid inputs fail closed', () => {
  for (const changes of [
    { age: 34 }, { age: 96 }, { psa: -1 }, { psa: 100 }, { psa: NaN },
    { stage: 5 }, { grade: 6 }, { biopsy: 3 }, { comorbidity: 2 },
  ]) assert.throws(() => predictProstate({ ...scenario(), ...changes }));
  for (const years of [0, 16, 2.5]) {
    assert.throws(() => predictProstate(scenario(), { years }));
  }
  assert.throws(() => predictProstate(scenario(), { method: 'not-supported' }));
});
