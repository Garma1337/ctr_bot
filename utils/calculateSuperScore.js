const {
  BATTLE, _4V4, _3V3, DUOS, ITEMLESS, ITEMS,
} = require('../db/models/ranked_lobbies');

/**
 * Returns a player's superscore
 * @param rank
 * @param baseRank
 * @returns {number}
 */
function calculateSuperScore(rank, baseRank = 500) {
  const itemsRank = rank[ITEMS].rank || baseRank;
  const itemlessRank = rank[ITEMLESS].rank || baseRank;
  const duosRank = rank[DUOS].rank || baseRank;
  const _3v3Rank = rank[_3V3].rank || baseRank;
  const _4v4Rank = rank[_4V4].rank || baseRank;
  const battleRank = rank[BATTLE].rank || baseRank;

  return Math.floor((Number(itemsRank) + Number(itemlessRank) + Number(duosRank) + Number(_3v3Rank) + Number(_4v4Rank) + Number(battleRank)) / 6);
}

module.exports = calculateSuperScore;
