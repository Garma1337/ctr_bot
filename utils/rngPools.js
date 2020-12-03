const getRandomArrayElement = require('./getRandomArrayElement');

const {
  BATTLE, _4V4, _3V3, DUOS, ITEMLESS, ITEMS,
} = require('../db/models/ranked_lobbies');

const {
  itemPools, battlePools, _4v4Pools, spicyPools,
} = require('./pools');

async function rngPools(doc) {
  const fromPools = doc.pools;
  let pools;
  let N;

  switch (doc.type) {
    case ITEMS:
    case DUOS:
    case _3V3:
      N = 8;

      if (!doc.spicyTracks) {
        pools = itemPools;
      } else {
        pools = [getRandomArrayElement(spicyPools)];
      }

      break;
    case ITEMLESS:
      N = 5;
      pools = _4v4Pools;
      pools[3].splice(7, 1); // Remove Megamix Mania
      break;
    case _4V4:
      N = 10;

      if (!doc.spicyTracks) {
        pools = _4v4Pools;
        pools[2].splice(7, 1); // Remove Spyro Circuit
      } else {
        pools = [getRandomArrayElement(spicyPools)];
      }

      break;
    case BATTLE:
      N = 5;
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

  return maps;
}

module.exports = rngPools;
