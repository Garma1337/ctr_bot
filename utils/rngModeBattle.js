const { battleModes } = require('./modes_battle');

async function rngModeBattle(tracks) {
  const modes = [];
  const modeNames = [];

  battleModes.forEach((battleMode) => {
    battleMode.forEach((mode) => {
      modes.push(mode);
      modeNames.push(mode.name);
    });
  });

  const N = tracks.length;

  const randomModes = [];

  for (let i = 0; i < N; i++) {
    while (true) {
      const rng = Math.floor(modeNames.length * Math.random());
      const mode = modes.find((m) => m.name === modeNames[rng]);

      if (mode.tracks.length < 1 || mode.tracks.includes(tracks[i])) {
        randomModes.push(modeNames[rng]);
        modeNames.splice(rng, 1);

        break;
      }
    }
  }

  return randomModes;
}

module.exports = rngModeBattle;
