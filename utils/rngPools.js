const getRandomArrayElement = require('./getRandomArrayElement');

const {
  RACE_FFA,
  RACE_ITEMLESS,
  RACE_DUOS,
  RACE_3V3,
  RACE_4V4,
  RACE_SURVIVAL,
  RACE_ITEMLESS_DUOS,
  BATTLE_FFA,
  BATTLE_4V4,
} = require('../db/models/ranked_lobbies');

const {
  itemPools, battlePools, _4v4Pools, spicyPools,
} = require('./pools');

async function rngPools(doc) {
  const fromPools = doc.pools;
  let pools;
  let N;

  switch (doc.type) {
    case RACE_FFA:
    case RACE_DUOS:
    case RACE_3V3:
    case RACE_SURVIVAL:
    case RACE_ITEMLESS_DUOS:
      N = 8;

      if (!doc.spicyTracks) {
        pools = itemPools;
      } else {
        pools = [getRandomArrayElement(spicyPools)];
      }

      break;
    case RACE_ITEMLESS:
      N = 5;
      pools = _4v4Pools;
      pools[3].splice(7, 1); // Remove Megamix Mania
      break;
    case RACE_4V4:
      N = 10;

      if (!doc.spicyTracks) {
        pools = _4v4Pools;
        pools[2].splice(7, 1); // Remove Spyro Circuit
      } else {
        pools = [getRandomArrayElement(spicyPools)];
      }

      break;
    case BATTLE_FFA:
      N = 5;
      pools = battlePools;
      break;
    case BATTLE_4V4:
      N = 8;
      pools = battlePools;
      break;
    default:
      break;
  }

  if (!fromPools) {
    pools = [pools.flat()];
  }

  const poolSize = pools.flat().length;
  const poolSlice = N / pools.length;

  if (!Number.isInteger(poolSlice)) {
    throw Error('Something is wrong with pools');
  }

  const randomFractionsNumber = poolSize + N;

  const rng = Array(randomFractionsNumber).fill(0).map(() => Math.random());

  let maps = [];

  pools.forEach((pool, i) => {
    const sliceRng = rng.splice(0, pool.length);

    const randomizedPool = pool.map((p, i) => {
      const rngNumber = sliceRng[i];
      return [p, rngNumber];
    })
      .sort((a, b) => a[1] - b[1])
      .map((p) => p[0]);

    const slice = randomizedPool.slice(0, poolSlice);
    maps.push(...slice);
  });

  const sliceRng = rng.splice(0, maps.length);

  maps = maps.map((p, i) => {
    const rngNumber = sliceRng[i];
    return [p, rngNumber];
  })
    .sort((a, b) => a[1] - b[1])
    .map((p) => p[0]);

  maps = maps.map((m) => {
    if (m === 'Turbo Track' && Math.random() > 0.5) {
      m = 'Retro Stadium';
    }
    return m;
  });

  // Survival is only 7 races, so we just remove one Track
  if (doc.type === RACE_SURVIVAL) {
    maps.pop();
  }

  return maps;
}

module.exports = rngPools;
