const {
  RACE_FFA,
  RACE_ITEMLESS_FFA,
  BATTLE_FFA,
} = require('../db/models/lobby');

/**
 * Returns a player's superscore
 * @param rank
 * @param baseRank
 * @returns {number}
 */
function calculateSuperScore(rank, baseRank = 500) {
  const itemsRank = rank[RACE_FFA].rank || baseRank;
  const itemlessRank = rank[RACE_ITEMLESS_FFA].rank || baseRank;
  const battleRank = rank[BATTLE_FFA].rank || baseRank;

  const itemsRankFraction = itemsRank * 0.50;
  const itemlessRankFraction = itemlessRank * 0.40;
  const battleRankFraction = battleRank * 0.10;

  // eslint-disable-next-line max-len
  return Math.floor(itemsRankFraction + itemlessRankFraction + battleRankFraction);
}

module.exports = calculateSuperScore;
