const {
  RACE_FFA,
  RACE_SURVIVAL,
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
  const survivalRank = rank[RACE_SURVIVAL].rank || baseRank;

  // eslint-disable-next-line max-len
  return Math.ceil(itemsRank + itemlessRank + battleRank + survivalRank);
}

module.exports = calculateSuperScore;
