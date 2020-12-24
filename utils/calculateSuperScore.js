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

  const itemsRankFraction = itemsRank * 0.15;
  const itemlessRankFraction = itemlessRank * 0.25;
  const duosRankFraction = duosRank * 0.2;
  const warRankFraction = ((_3v3Rank * 0.25 + _4v4Rank * 0.75) / 2) * 0.35;
  const battleRankFraction = battleRank * 0.05;

  return Math.floor(itemsRankFraction + itemlessRankFraction + duosRankFraction + warRankFraction + battleRankFraction);
}

module.exports = calculateSuperScore;
