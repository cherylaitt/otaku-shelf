import { Environment, RARITY_WEIGHTS, Rarity } from '../../shared/types/models';

/** Weighted random rarity pick: common 60% / rare 28% / epic 10% / legendary 2%. */
export function weightedRandomRarity(): Rarity {
  const entries = Object.entries(RARITY_WEIGHTS) as [Rarity, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of entries) {
    if (roll < weight) return rarity;
    roll -= weight;
  }
  return entries[entries.length - 1][0];
}

/**
 * Draws one Environment from a single category's pool, weighted by rarity.
 * If the rolled rarity has no entries in the pool (shouldn't happen with the
 * seeded catalog, but is possible with a sparse custom catalog), falls back
 * to a uniform pick across the whole pool so a pull never fails to resolve.
 */
export function drawEnvironment(pool: Environment[]): Environment {
  if (pool.length === 0) throw new Error('Cannot draw from an empty environment pool');
  const rarity = weightedRandomRarity();
  const candidates = pool.filter((env) => env.rarity === rarity);
  const finalPool = candidates.length > 0 ? candidates : pool;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}
