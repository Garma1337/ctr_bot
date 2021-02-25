const { Player } = require('../db/models/player');
const { Rank } = require('../db/models/rank');
const calculateSuperScore = require('./calculateSuperScore');
const getConfigValue = require('./getConfigValue');

/**
 * Generates a ranking of all super scores
 * @returns Array
 */
async function generateSuperScoreRanking() {
  const list = [];
  const superScores = [];

  const players = await Player.find({ psn: { $ne: null } });
  const psns = players.map((p) => p.psn);

  const ranks = await Rank.find({ name: { $in: psns } });
  const baseRank = await getConfigValue('super_score_base_rank');

  ranks.forEach((r) => {
    const player = players.find((p) => p.psn === r.name);

    superScores.push({
      discordId: player.discordId,
      psn: r.name,
      flag: player.flag,
      superScore: calculateSuperScore(r, baseRank),
    });
  });

  superScores.sort((a, b) => a.superScore + b.superScore).forEach((s, i) => {
    list.push({
      discordId: s.discordId,
      psn: s.psn,
      flag: s.flag,
      rank: (i + 1),
      superScore: s.superScore,
    });
  });

  return list;
}

module.exports = generateSuperScoreRanking;
