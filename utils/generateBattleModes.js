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
  BATTLE_SURVIVAL,
} = require('../db/models/lobby');

async function generateBattleModes(type, arenas, playerCount) {
  let list;
  if (type === BATTLE_1V1) {
    list = battleModes1v1;
  } else if ([BATTLE_FFA, BATTLE_SURVIVAL].includes(type)) {
    list = battleModesSolos;
  } else if ([BATTLE_DUOS, BATTLE_3V3, BATTLE_4V4].includes(type)) {
    list = battleModesTeams;
  } else {
    list = battleModesSolos;
  }

  const modes = [];
  const modeNames = [];

  list.forEach((battleMode) => {
    battleMode.forEach((mode) => {
      modes.push(mode);
      modeNames.push(mode.name);
    });
  });

  const N = arenas.length;
  const randomModes = [];
  const maxModeUsage = Math.ceil(N / modeNames.length);

  for (let i = 0; i < N; i += 1) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const rng = Math.floor(modeNames.length * Math.random());
      const mode = modes.find((m) => m.name === modeNames[rng]);
      const modeUsageCount = randomModes.filter((rm) => rm === modeNames[rng]).length;

      // eslint-disable-next-line max-len
      if (modeUsageCount < maxModeUsage && (mode.arenas.length < 1 || mode.arenas.includes(arenas[i])) && mode.maxPlayers >= playerCount) {
        randomModes.push(modeNames[rng]);

        break;
      }
    }
  }

  return randomModes;
}

module.exports = generateBattleModes;
