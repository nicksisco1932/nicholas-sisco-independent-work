/**
 * Research-only reconstruction of historical PREDICT Prostate (2019) coefficients.
 * The legacy allocation follows the archived individual algorithm; the
 * continuous method is an original competing-risk integration of its hazards.
 * Neither method is an updated clinical calculator or a causal treatment model.
 * Primary source: https://doi.org/10.1371/journal.pmed.1002758
 */
export function predictProstate(p, { radical = false, years = 15, method = 'continuous' } = {}) {
  if (!Number.isFinite(p.age) || p.age < 35 || p.age > 95) throw Error('Age must be 35–95.');
  if (!Number.isFinite(p.psa) || p.psa < 0 || p.psa >= 100) throw Error('PSA must be 0–<100 ng/mL.');
  for (const [key, allowed] of Object.entries({
    grade: [1, 2, 3, 4, 5], stage: [1, 2, 3, 4],
    biopsy: [0, 1, 2], comorbidity: [0, 1],
  })) {
    if (!allowed.includes(p[key])) throw Error('Invalid ' + key + '.');
  }
  if (!Number.isInteger(years) || years < 1 || years > 15) {
    throw Error('Follow-up must be between 1 and 15 whole years.');
  }
  if (typeof radical !== 'boolean' || !['legacy', 'continuous'].includes(method)) {
    throw Error('Invalid management or allocation method.');
  }

  const pcIndex =
    0.0026005 * ((p.age / 10) ** 3 - 341.155151)
    + 0.185959 * (Math.log((p.psa + 1) / 100) + 1.636423432)
    + [0, 0, .1614922, .39767881, .6330977][p.stage]
    + [0, 0, .2791641, .5464889, .7411321, 1.367963][p.grade]
    - .6837094 * Number(radical)
    + [0, -.617722958, .579225231][p.biopsy];
  const otherIndex = .1226666 * (p.age - 69.87427439) + .6382002 * p.comorbidity;
  function cumulativeHazards(days) {
    if (days === 0) return [0, 0];
    return [
      Math.exp(pcIndex - 16.40532 + 1.653947 * Math.log(days) + 1.89e-12 * days ** 3),
      Math.exp(otherIndex - 12.4841 + 1.32274 * Math.log(days) + 2.90e-12 * days ** 3),
    ];
  }

  let alive = 1, pcDeath = 0, otherDeath = 0;
  if (method === 'legacy') {
    let previousPC = 0, previousOther = 0, previousAll = 0;
    for (let y = 1; y <= years; y++) {
      const [hp, ho] = cumulativeHazards(365 * y);
      const pc = -Math.expm1(-hp), other = -Math.expm1(-ho);
      const all = -Math.expm1(-hp - ho);
      const dpc = pc - previousPC, doc = other - previousOther;
      const fraction = dpc + doc > 0 ? dpc / (dpc + doc) : 0;
      const increment = all - previousAll;
      pcDeath += fraction * increment;
      otherDeath += (1 - fraction) * increment;
      previousPC = pc; previousOther = other; previousAll = all;
      alive = Math.exp(-hp - ho);
    }
  } else {
    const steps = 8192;
    const dt = 365 * years / steps;
    for (let i = 1; i <= steps; i++) {
      const mid = (i - .5) * dt;
      const [hp, ho] = cumulativeHazards(mid);
      const [ep, eo] = cumulativeHazards(i * dt);
      const pcHazard = hp * (1.653947 / mid + 3 * 1.89e-12 * mid ** 2);
      const otherHazard = ho * (1.32274 / mid + 3 * 2.90e-12 * mid ** 2);
      const nextAlive = Math.exp(-ep - eo);
      const delta = alive - nextAlive;
      pcDeath += delta * pcHazard / (pcHazard + otherHazard);
      otherDeath += delta * otherHazard / (pcHazard + otherHazard);
      alive = nextAlive;
    }
  }
  return { alive, pcDeath, otherDeath };
}
