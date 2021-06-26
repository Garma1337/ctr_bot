const {
  battleModes1v1,
  battleModesSolos,
  battleModesTeams,
} = require('../db/modes_battle');

const {
  BATTLE_1V1,
  BATTLE_FFA,
  BATTLE_DUOS,
  BATTLE_3V3,
  BATTLE_4V4,
} = require('../db/models/lobby');

async function generateBattleModes(doc, arenas) {
  let list;
  if (doc.type === BATTLE_1V1) {
    list = battleModes1v1;
  } else if ([BATTLE_FFA].includes(doc.type)) {
    list = battleModesSolos;
  } else if ([BATTLE_DUOS, BATTLE_3V3, BATTLE_4V4].includes(doc.type)) {
    list = battleModesTeams;
  } else {
    list = battleModesSolos;
  }

  const modes = [];
  const modeNames = [];

  list.forEach((battleMode) => {
    battleMode.forEach((mode) => {
      const isSideMode = !(mode.settings[0].includes('Limit Battle') || mode.settings[0].includes('Last Kart Driving'));

      if (!doc.limitAndLKDOnly || (doc.limitAndLKDOnly && !isSideMode)) {
        modes.push(mode);
        modeNames.push(mode.name);
      }
    });
  });

  const N = arenas.length;
  const randomModes = [];
  const maxModeUsage = Math.ceil(N / modeNames.length);

  for (let i = 0; i < N; i += 1) {
    let currentIterations = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const rng = Math.floor(modeNames.length * Math.random());
      const mode = modes.find((m) => m.name === modeNames[rng]);
      const modeUsageCount = randomModes.filter((rm) => rm === modeNames[rng]).length;

      // eslint-disable-next-line max-len
      if (modeUsageCount < maxModeUsage && (mode.arenas.length < 1 || mode.arenas.includes(arenas[i])) && mode.maxPlayers >= doc.players.length) {
        randomModes.push(modeNames[rng]);

        break;
      }

      if (currentIterations >= 100) {
        throw new Error('Could not generate battle modes!');
      }

      // eslint-disable-next-line no-plusplus
      currentIterations++;
    }
  }

  return randomModes;
}

module.exports = generateBattleModes;
