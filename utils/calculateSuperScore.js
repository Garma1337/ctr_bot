const {
  BATTLE, _4V4, _3V3, DUOS, ITEMLESS, ITEMS,
} = require('../db/models/ranked_lobbies');

/**
 * Returns a player's superscore
 * @param rank
 * @returns {number}
 */
function calculateSuperScore(rank) {
  const baseRank = 500;

  const itemsRank = rank[ITEMS].rank || baseRank;
  const itemlessRank = rank[ITEMLESS].rank || baseRank;
  const duosRank = rank[DUOS].rank || baseRank;
  const _3v3Rank = rank[_3V3].rank || baseRank;
  const _4v4Rank = rank[_4V4].rank || baseRank;
  const battleRank = rank[BATTLE].rank || baseRank;

  return Math.floor((itemsRank * 0.1) + (itemlessRank * 0.25) + (duosRank * 0.15) + (_3v3Rank * 0.20) + (_4v4Rank * 0.3) + (battleRank * 0.05));
}

module.exports = calculateSuperScore;
