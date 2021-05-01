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
  let itemsRank = rank[RACE_FFA].rank || baseRank;
  let itemlessRank = rank[RACE_ITEMLESS_FFA].rank || baseRank;
  let battleRank = rank[BATTLE_FFA].rank || baseRank;

  itemsRank = parseInt(itemsRank, 10);
  itemlessRank = parseInt(itemlessRank, 10);
  battleRank = parseInt(battleRank, 10);

  // eslint-disable-next-line max-len
  return Math.ceil(itemsRank + itemlessRank + battleRank);
}

module.exports = calculateSuperScore;
