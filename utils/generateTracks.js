const poolTracks3 = require('../db/pools/tracks_3');
const poolTracks4 = require('../db/pools/tracks_4');
const poolTracks5 = require('../db/pools/tracks_5');
const poolBattle3 = require('../db/pools/battle_3');
const poolBattle4 = require('../db/pools/battle_4');
const poolBattle5 = require('../db/pools/battle_5');

/**
 * shuffles an array
 * @param array
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

/**
 * Removes banned tracks from the track pool
 * @param pool
 * @param doc
 * @returns array
 */
function removeBannedTracks(pool, doc) {
  const bannedTracks = doc.getBannedTracks();
  return pool.filter((t) => !bannedTracks.includes(t));
}

/**
 * Generates tracks from pools
 * @param doc
 * @returns Array
 */
async function generateTracks(doc) {
  if (doc.trackCount <= 0) {
    return ['-'];
  }

  let pools;

  if (doc.isRacing()) {
    if (doc.trackCount % 3 === 0) {
      pools = poolTracks3;
    } else if (doc.trackCount % 4 === 0) {
      pools = poolTracks4;
    } else if (doc.trackCount % 5 === 0) {
      pools = poolTracks5;
    } else {
      pools = poolTracks4;
    }
  } else if (doc.isBattle()) {
    if (doc.trackCount % 3 === 0) {
      pools = poolBattle3;
    } else if (doc.trackCount % 4 === 0) {
      pools = poolBattle4;
    } else if (doc.trackCount % 5 === 0) {
      pools = poolBattle5;
    } else {
      pools = poolBattle4;
    }
  } else {
    pools = [];
  }

  if (!doc.pools) {
    pools = [pools.flat()];
  }

  let maps = [];

  if (!doc.isIronMan()) {
    if (pools.length > 1) {
      const perPool = Math.floor(doc.trackCount / pools.length);
      const remainder = doc.trackCount % pools.length;

      pools.forEach((p, i) => {
        pools[i] = removeBannedTracks(pools[i], doc);

        for (let x = 0; x < perPool; x += 1) {
          const trackIndex = Math.floor(Math.random() * pools[i].length);

          maps.push(pools[i][trackIndex]);
          pools[i].splice(trackIndex, 1);
        }
      });

      for (let x = 0; x < remainder; x += 1) {
        const poolIndex = Math.floor(Math.random() * pools.length);
        const randomPool = removeBannedTracks(pools[poolIndex], doc);
        const trackIndex = Math.floor(Math.random() * randomPool.length);

        maps.push(randomPool[trackIndex]);
        pools[poolIndex].splice(trackIndex, 1);
        pools.splice(poolIndex, 1);
      }
    } else {
      const pool = removeBannedTracks(pools[0], doc);

      for (let i = 0; i < doc.trackCount; i += 1) {
        const trackIndex = Math.floor(Math.random() * pool.length);

        maps.push(pool[trackIndex]);
        pool.splice(trackIndex, 1);
      }
    }
  } else {
    maps = pools[0];
  }

  maps = maps.map((m) => {
    if (m === 'Turbo Track' && Math.random() > 0.5) {
      m = 'Retro Stadium';
    }

    return m;
  });

  return shuffle(maps);
}

module.exports = generateTracks;
