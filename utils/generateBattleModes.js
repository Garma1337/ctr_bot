const { battleModesFFA, battleModes4v4 } = require('../db/modes_battle');
const {
  BATTLE_FFA,
  BATTLE_DUOS,
  BATTLE_3V3,
  BATTLE_4V4,
  BATTLE_SURVIVAL,
} = require('../db/models/lobby');

async function generateBattleModes(type, maps) {
  let list;
  if ([BATTLE_FFA, BATTLE_SURVIVAL].includes(type)) {
    list = battleModesFFA;
  } else if ([BATTLE_DUOS, BATTLE_3V3, BATTLE_4V4].includes(type)) {
    list = battleModes4v4;
  } else {
    list = battleModesFFA;
  }

  const modes = [];
  const modeNames = [];

  list.forEach((battleMode) => {
    battleMode.forEach((mode) => {
      modes.push(mode);
      modeNames.push(mode.name);
    });
  });

  const N = maps.length;
  const randomModes = [];
  const maxModeUsage = Math.ceil(N / modeNames.length);

  for (let i = 0; i < N; i += 1) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const rng = Math.floor(modeNames.length * Math.random());
      const mode = modes.find((m) => m.name === modeNames[rng]);
      const modeUsageCount = randomModes.filter((rm) => rm === modeNames[rng]).length;

      if (modeUsageCount < maxModeUsage && (mode.maps.length < 1 || mode.maps.includes(maps[i]))) {
        randomModes.push(modeNames[rng]);

        break;
      }
    }
  }

  return randomModes;
}

module.exports = generateBattleModes;