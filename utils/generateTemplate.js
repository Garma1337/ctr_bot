const {
  BATTLE, _4V4, _3V3, DUOS, ITEMLESS, ITEMS,
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
    case ITEMS:
      title = 'Match # - Items FFA\n';
      numberOfMaps = 8;
      break;
    case ITEMLESS:
      title = 'Match # - Itemless FFA\n';
      numberOfMaps = 5;
      break;
    case DUOS:
      title = '#title Match #\n';
      numberOfMaps = 8;
      break;
    case _3V3:
      title = '#title Match #\n';
      numberOfMaps = 8;
      break;
    case _4V4:
      title = '#title Match #\n';
      numberOfMaps = 10;
      break;
    case BATTLE:
      title = 'Match # - Battle FFA\n';
      numberOfMaps = 5;
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
    if (rank[doc.type] && rank[doc.type].rank) {
      mmr = parseInt(rank[doc.type].rank, 10);
    }

    PSNs.push(`${x.psn.replace('_', '\\_')} [${mmr}]`);
    consoles.push(...x.consoles);
  }

  return [PSNs, `https://gb.hlorenzi.com/table?data=${encodedData}`, template, consoles];
}

module.exports = generateTemplate;
