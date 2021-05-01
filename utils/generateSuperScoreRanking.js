const { Player } = require('../db/models/player');
const { Rank } = require('../db/models/rank');
const calculateSuperScore = require('./calculateSuperScore');
const getConfigValue = require('./getConfigValue');

/**
 * Generates a ranking of all super scores
 * @returns Array
 */
async function generateSuperScoreRanking() {
  let superScores = [];

  const players = await Player.find({ rankedName: { $ne: null } });
  const rankedNames = players.map((p) => p.rankedName);

  const ranks = await Rank.find({ name: { $in: rankedNames } });
  const baseRank = await getConfigValue('super_score_base_rank');

  ranks.forEach((r) => {
    const player = players.find((p) => p.rankedName === r.name);

    if (player) {
      superScores.push({
        discordId: player.discordId,
        rankedName: r.name,
        psn: player.psn,
        flag: player.flag,
        superScore: calculateSuperScore(r, baseRank),
      });
    }
  });

  superScores = superScores
    .sort((a, b) => b.superScore - a.superScore)
    .map((s, i) => ({
      discordId: s.discordId,
      rankedName: s.rankedName,
      psn: s.psn,
      flag: s.flag,
      rank: (i + 1),
      superScore: s.superScore,
    }));

  return superScores;
}

module.exports = generateSuperScoreRanking;
