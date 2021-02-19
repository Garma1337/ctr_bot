const {
  RACE_FFA,
  RACE_DUOS,
  RACE_3V3,
  RACE_4V4,
  RACE_ITEMLESS_FFA,
  BATTLE_FFA,
  BATTLE_4V4,
} = require('../db/models/lobby');

/**
 * Returns a player's superscore
 * @param rank
 * @param baseRank
 * @returns {number}
 */
function calculateSuperScore(rank, baseRank = 500) {
  const itemsFFARank = rank[RACE_FFA].rank || baseRank;
  const duosRank = rank[RACE_DUOS].rank || baseRank;
  const _3v3Rank = rank[RACE_3V3].rank || baseRank;
  const _4v4Rank = rank[RACE_4V4].rank || baseRank;
  const itemlessFFARank = rank[RACE_ITEMLESS_FFA].rank || baseRank;
  const battleFFARank = rank[BATTLE_FFA].rank || baseRank;
  const battle4v4Rank = rank[BATTLE_4V4].rank || baseRank;

  const itemsFFARankFraction = itemsFFARank * 0.15;
  const duosRankFraction = duosRank * 0.2;
  const warRankFraction = (_3v3Rank * 0.25 + _4v4Rank * 0.75) * 0.40;
  const itemlessFFARankFraction = itemlessFFARank * 0.25;
  const battleFFARankFraction = battleFFARank * 0.25;
  const battle4v4RankFraction = battle4v4Rank * 0.75;

  // eslint-disable-next-line max-len
  const raceFraction = (itemsFFARankFraction + duosRankFraction + warRankFraction + itemlessFFARankFraction) * 0.8;
  const battleFraction = (battleFFARankFraction + battle4v4RankFraction) * 0.2;

  return Math.floor(raceFraction + battleFraction);
}

module.exports = calculateSuperScore;
