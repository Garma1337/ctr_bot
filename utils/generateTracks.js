const shuffleArray = require('./shuffleArray');

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
 * @returns Promise
 */
async function generateTracks(doc) {
  const pools = doc.getTrackPools();
  if (pools.length <= 0) {
    return ['-'];
  }

  let maps = [];
  const tmpPools = [...pools];

  if (!doc.isIronMan()) {
    if (tmpPools.length > 1) {
      const perPool = Math.floor(doc.trackCount / tmpPools.length);
      let remainder = doc.trackCount % tmpPools.length;

      tmpPools.forEach((p, i) => {
        p = removeBannedTracks(p, doc);
        if (p.length <= 0) {
          // eslint-disable-next-line no-plusplus
          remainder += perPool;
          return;
        }

        for (let x = 0; x < perPool; x += 1) {
          const trackIndex = Math.floor(Math.random() * p.length);

          maps.push(p[trackIndex]);
          p.splice(trackIndex, 1);
        }

        tmpPools[i] = p;
      });

      for (let x = 0; x < remainder; x += 1) {
        const poolIndex = Math.floor(Math.random() * tmpPools.length);

        const randomPool = removeBannedTracks(tmpPools[poolIndex], doc);
        if (randomPool.length <= 0) {
          x -= 1;

          // eslint-disable-next-line no-continue
          continue;
        }

        const trackIndex = Math.floor(Math.random() * randomPool.length);

        maps.push(randomPool[trackIndex]);
        tmpPools[poolIndex].splice(trackIndex, 1);
        tmpPools.splice(poolIndex, 1);
      }
    } else {
      const pool = removeBannedTracks(tmpPools[0], doc);
      const trackCount = (doc.trackCount > pool.length ? pool.length : doc.trackCount);

      for (let i = 0; i < trackCount; i += 1) {
        const trackIndex = Math.floor(Math.random() * pool.length);

        maps.push(pool[trackIndex]);
        pool.splice(trackIndex, 1);
      }
    }
  } else {
    maps = tmpPools[0];
  }

  maps = maps.map((m) => {
    if (m === 'Turbo Track' && Math.random() > 0.5) {
      m = 'Retro Stadium';
    }

    return m;
  });

  return shuffleArray(maps);
}

module.exports = generateTracks;
