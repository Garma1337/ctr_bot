const {
  RACE_FFA,
  RACE_DUOS,
  RACE_3V3,
  RACE_4V4,
  RACE_SURVIVAL,
  RACE_KRUNKING,
  RACE_ITEMLESS_FFA,
  RACE_ITEMLESS_DUOS,
  RACE_ITEMLESS_3V3,
  RACE_ITEMLESS_4V4,
  BATTLE_1V1,
  BATTLE_FFA,
  BATTLE_DUOS,
  BATTLE_3V3,
  BATTLE_4V4,
  BATTLE_SURVIVAL,
  CUSTOM,
} = require('../db/models/lobby');

const { Player } = require('../db/models/player');
const { Rank } = require('../db/models/rank');

const { flagToCode } = require('../db/regional_indicators');

function getPlayerData(p) {
  let flag = '';
  if (p.flag) {
    const code = flagToCode(p.flag);
    if (code) {
      flag = ` [${code}]`; // space in the beginning is needed
    }
  }

  return `${p.rankedName}${flag}`;
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
  let numberOfMaps = doc.trackCount;

  switch (doc.type) {
    case RACE_FFA:
      title += 'Match # - FFA\n';
      break;
    case RACE_DUOS:
      title += '#title Match # - Duos\n';
      break;
    case RACE_3V3:
      title += '#title Match # - 3 vs. 3\n';
      break;
    case RACE_4V4:
      title += '#title Match # - 4 vs. 4\n';
      break;
    case RACE_SURVIVAL:
      title += 'Match # - Survival\n';
      numberOfMaps = 1;
      break;
    case RACE_KRUNKING:
      title += '#title Match # - Krunking\n';
      break;
    case RACE_ITEMLESS_FFA:
      title += 'Match # - Itemless FFA\n';
      break;
    case RACE_ITEMLESS_DUOS:
      title += '#title Match # - Itemless Duos\n';
      break;
    case RACE_ITEMLESS_3V3:
      title += '#title Match # - Itemless 3 vs. 3\n';
      break;
    case RACE_ITEMLESS_4V4:
      title += '#title Match # - Itemless 4 vs. 4\n';
      break;
    case BATTLE_1V1:
      title += 'Match # - Battle 1 vs. 1\n';
      break;
    case BATTLE_FFA:
      title += 'Match # - Battle FFA\n';
      break;
    case BATTLE_DUOS:
      title += '#title Match # - Battle Duos\n';
      break;
    case BATTLE_3V3:
      title += '#title Match # - Battle 3 vs. 3\n';
      break;
    case BATTLE_4V4:
      title += '#title Match # - Battle 4 vs. 4\n';
      break;
    case BATTLE_SURVIVAL:
      title += 'Match # - Battle Survival\n';
      numberOfMaps = 1;
      break;
    case CUSTOM:
      title += 'Match # - Custom\n';
      numberOfMaps = 1;
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
  for (const x of playerDocs) {
    const rank = await Rank.findOne({ name: x.psn });

    let mmr = doc.getDefaultRank();
    if (rank && rank[doc.type] && rank[doc.type].rank) {
      mmr = parseInt(rank[doc.type].rank, 10);
    }

    PSNs.push(`${x.psn.replace('_', '\\_')} [${mmr}]`);
  }

  return [PSNs, `https://gb.hlorenzi.com/table?data=${encodedData}`, template];
}

module.exports = generateTemplate;
