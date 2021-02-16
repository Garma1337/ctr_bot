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
} = require('../db/models/ranked_lobby');

const {
  itemPools,
  battlePools,
  _4v4Pools,
  spicyPools,
} = require('../db/track_pools');

/**
 * shuffles an array
 * @param array
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

async function rngPools(doc) {
  const fromPools = doc.pools;
  let pools;

  switch (doc.type) {
    case RACE_FFA:
    case RACE_DUOS:
    case RACE_3V3:
    case RACE_SURVIVAL:
    case RACE_ITEMLESS_DUOS:
      if (doc.spicyTracks) {
        pools = [getRandomArrayElement(spicyPools)];
      } else {
        pools = itemPools;

        if (doc.isSurvival()) {
          pools[1].push('Spyro Circuit'); // Make Spyro Circuit appear in Survival
        }
      }

      break;
    case RACE_ITEMLESS:
      pools = _4v4Pools;
      pools[3].splice(7, 1); // Remove Megamix Mania
      break;
    case RACE_4V4:
      if (doc.spicyTracks) {
        pools = [getRandomArrayElement(spicyPools)];
      } else {
        pools = _4v4Pools;
        pools[2].splice(7, 1); // Remove Spyro Circuit
      }

      break;
    case BATTLE_FFA:
      pools = battlePools;
      break;
    case BATTLE_4V4:
      pools = battlePools;
      break;
    default:
      break;
  }

  if (!fromPools) {
    pools = [pools.flat()];
  }

  let maps = [];

  if (!doc.isIronMan()) {
    const poolSize = pools.flat().length;
    const poolSlice = doc.trackCount / pools.length;

    if (!Number.isInteger(poolSlice)) {
      throw Error('Something is wrong with pools');
    }

    const randomFractionsNumber = poolSize + doc.trackCount;
    const rng = Array(randomFractionsNumber).fill(0).map(() => Math.random());

    pools.forEach((pool) => {
      const sliceRng = rng.splice(0, pool.length);

      const randomizedPool = pool.map((p, i) => {
        const rngNumber = sliceRng[i];
        return [p, rngNumber];
      }).sort((a, b) => a[1] - b[1]).map((p) => p[0]);

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

    // Survival is only 7 races, so we just remove one Track
    if (doc.type === RACE_SURVIVAL) {
      maps.pop();
    }
  } else {
    maps = shuffle(pools);
  }

  maps = maps.map((m) => {
    if (m === 'Turbo Track' && Math.random() > 0.5) {
      m = 'Retro Stadium';
    }
    return m;
  });

  return maps;
}

module.exports = rngPools;
