const { battleModesFFA, battleModes4v4 } = require('./modes_battle');
const { BATTLE_FFA, BATTLE_4V4 } = require('../db/models/ranked_lobbies');

async function rngModeBattle(type, maps) {
  let list;
  if (type === BATTLE_FFA) {
    list = battleModesFFA;
  } else if (type === BATTLE_4V4) {
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

  for (let i = 0; i < N; i++) {
    while (true) {
      const rng = Math.floor(modeNames.length * Math.random());
      const mode = modes.find((m) => m.name === modeNames[rng]);
      const modeUsageCount = randomModes.filter((rm) => rm === modeNames[rng]).length;

      if (type === BATTLE_FFA || (type === BATTLE_4V4 && modeUsageCount < 3)) {
        if (mode.maps.length < 1 || mode.maps.includes(maps[i])) {
          randomModes.push(modeNames[rng]);

          // Allow repeated modes in Battle 4 vs. 4
          if (type !== BATTLE_4V4) {
            modeNames.splice(rng, 1);
          }

          break;
        }
      }
    }
  }

  return randomModes;
}

module.exports = rngModeBattle;
