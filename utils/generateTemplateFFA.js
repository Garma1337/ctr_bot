const Player = require('../db/models/player');

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

async function generateTemplateFFA(players, doc = true, maps = 8) {
  const title = doc.battle ? 'Ranked Battle Mode' : doc.duos ? 'Ranked Duos' : `${doc.items ? 'Items FFA' : 'Itemless FFA'}`;
  const docs = await Player.find({ discordId: { $in: players } });

  const rows = [];
  const points = `${Array(maps).fill(0).join('|')}`;
  if (doc.duos) {
    doc.duosList.forEach((duo, i) => {
      rows.push(`Team ${teams[i]} ${colors[i]}`);
      duo.forEach((playerId) => {
        const p = docs.find((d) => d.discordId === playerId);
        rows.push(`${getPlayerData(p)} ${points}`);
      });
      rows.push('');
    });
  } else {
    rows.push(title);
    rows.push(...docs.map((p) => `${getPlayerData(p)} ${points}`));
  }
  const template = `${rows.join('\n')}`;
  let encodedData = encodeURI(template);
  encodedData = encodedData.replace(/#/g, '%23');

  const discordPsnMap = {};
  docs.forEach((p) => {
    discordPsnMap[p.discordId] = p.psn.replace('_', '\\_');
  });

  const PSNs = [];
  players.forEach((discordId) => {
    PSNs.push(discordPsnMap[discordId]);
  });

  // const PSNs = docs.map((p) => p.psn.replace('_', '\\_')).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  return [PSNs, `https://gb.hlorenzi.com/table?data=${encodedData}`];
}

module.exports = generateTemplateFFA;
