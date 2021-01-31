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

const Player = require('../db/models/player');
const Rank = require('../db/models/rank');

const { flagToCode } = require('./regional_indicators');

function getPlayerData(p) {
  let flag = '';
  if (p.flag) {
    const code = flagToCode(p.flag);
    if (code) {
      flag = ` [${code}]`; // space in the beginning is needed
    }
  }
  return `${p.psn}${flag}`;
}

const teams = ['A', 'B', 'C', 'D'];
const colors = ['#189dfe', '#ff0000', '#7fff00', '#fff000'];

async function generateTemplate(players, doc) {
  const playerDocs = [];
  for (const p of players) {
    const player = await Player.findOne({ discordId: p });
    playerDocs.push(player);
  }

  let title = '';
  let numberOfMaps = 0;

  switch (doc.type) {
    case RACE_FFA:
      title = 'Match # - FFA\n';
      numberOfMaps = 8;
      break;
    case RACE_ITEMLESS:
      title = 'Match # - Itemless\n';
      numberOfMaps = 5;
      break;
    case RACE_DUOS:
      title = 'Match # - Duos\n';
      numberOfMaps = 8;
      break;
    case RACE_3V3:
      title = 'Match # - 3 vs. 3\n';
      numberOfMaps = 8;
      break;
    case RACE_4V4:
      title = 'Match # - 4 vs. 4\n';
      numberOfMaps = 10;
      break;
    case RACE_SURVIVAL:
      title = 'Match # - Survival\n';
      numberOfMaps = 8;
      break;
    case RACE_ITEMLESS_DUOS:
      title = 'Match # - Itemless Duos\n';
      numberOfMaps = 8;
      break;
    case BATTLE_FFA:
      title = 'Match # - Battle FFA\n';
      numberOfMaps = 5;
      break;
    case BATTLE_4V4:
      title = 'Match # - Battle 4 vs. 4\n';
      numberOfMaps = 6;
      break;
    default:
      break;
  }

  const rows = [];
  const points = `${Array(numberOfMaps).fill(0).join('|')}`;
  if (doc.isTeams()) {
    rows.push(title);
    doc.teamList.forEach((team, i) => {
      rows.push(`Team ${teams[i]} ${colors[i]}`);
      team.forEach((playerId) => {
        const p = playerDocs.find((d) => d.discordId === playerId);
        rows.push(`${getPlayerData(p)} ${points}`);
      });
      rows.push('');
    });
  } else {
    rows.push(title);
    const playersAlphabetic = playerDocs.slice()
      .sort((a, b) => a.psn.toLowerCase().localeCompare(b.psn.toLowerCase()));
    rows.push(...playersAlphabetic.map((p) => `${getPlayerData(p)} ${points}`));
  }

  const template = `${rows.join('\n')}`;
  let encodedData = encodeURI(template);
  encodedData = encodedData.replace(/#/g, '%23');

  const PSNs = [];
  const consoles = [];
  for (const x of playerDocs) {
    const rank = await Rank.findOne({ name: x.psn });

    let mmr = 1200;
    if (rank && rank[doc.type] && rank[doc.type].rank) {
      mmr = parseInt(rank[doc.type].rank, 10);
    }

    PSNs.push(`${x.psn.replace('_', '\\_')} [${mmr}]`);
    consoles.push(...x.consoles);
  }

  return [PSNs, `https://gb.hlorenzi.com/table?data=${encodedData}`, template, consoles];
}

module.exports = generateTemplate;
