const {
  RACE_FFA,
  RACE_ITEMLESS,
  RACE_DUOS,
  RACE_3V3,
  RACE_4V4,
  RACE_SURVIVAL,
  RACE_ITEMLESS_DUOS,
  BATTLE_FFA,
  BATTLE_4V4,
} = require('../db/models/ranked_lobbies');

/**
 * Returns a player's superscore
 * @param rank
 * @param baseRank
 * @returns {number}
 */
function calculateSuperScore(rank, baseRank = 500) {
  const itemsRank = rank[RACE_FFA].rank || baseRank;
  const itemlessRank = rank[RACE_ITEMLESS].rank || baseRank;
  const duosRank = rank[RACE_DUOS].rank || baseRank;
  const _3v3Rank = rank[RACE_3V3].rank || baseRank;
  const _4v4Rank = rank[RACE_4V4].rank || baseRank;
  const survivalRank = rank[RACE_SURVIVAL].rank || baseRank;
  const itemlessDuosRank = rank[RACE_ITEMLESS_DUOS].rank || baseRank;
  const battleFFARank = rank[BATTLE_FFA].rank || baseRank;
  const battle4v4Rank = rank[BATTLE_4V4].rank || baseRank;

  const itemsRankFraction = itemsRank * 0.15;
  const itemlessRankFraction = itemlessRank * 0.25;
  const duosRankFraction = duosRank * 0.2;
  const warRankFraction = (_3v3Rank * 0.25 + _4v4Rank * 0.75) * 0.35;
  const survivalRankFraction = 0; // survivalRank * 0.01;
  const itemlessDuosRankFraction = 0; // itemlessDuosRank * 0.01;
  const battleFFARankFraction = battleFFARank * 0.05;
  const battle4v4RankFraction = 0; // battle4v4Rank * 0.01;

  return Math.floor(
    itemsRankFraction
    + itemlessRankFraction
    + duosRankFraction
    + warRankFraction
    + survivalRankFraction
    + itemlessDuosRankFraction
    + battleFFARankFraction
    + battle4v4RankFraction,
  );
}

module.exports = calculateSuperScore;
