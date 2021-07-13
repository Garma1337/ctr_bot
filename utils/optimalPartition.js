/**
 * Array partitioning with brute force selecting optimal partition (3 vs. 3)
 * @param objects
 * @param partitionSize
 * @param valueKey
 * @returns Object
 */
function optimalPartition3(objects, partitionSize, valueKey) {
  const result = {
    A: [],
    B: [],
    sumA: 0,
    sumB: 0,
  };

  let rankSum = 0;
  objects.forEach((a) => {
    rankSum += a[valueKey];
  });

  const averageRank = rankSum / 2;
  result.sumA = rankSum;

  /* iterate over all possible partitions */
  const n = objects.length;

  // eslint-disable-next-line guard-for-in
  for (let i = 0; i < n - 2; i += 1) {
    // eslint-disable-next-line guard-for-in
    for (let j = i; j < n - 1; j += 1) {
      // eslint-disable-next-line guard-for-in
      for (let k = j; k < n; k += 1) {
        // eslint-disable-next-line guard-for-in
        // eslint-disable-next-line max-len
        const discordIds = [
          objects[i].discordId,
          objects[j].discordId,
          objects[k].discordId,
        ];

        let hasDuplicates = false;
        discordIds.sort().forEach((d, x) => {
          const w = x - 1;
          const y = x + 1;

          if (discordIds[w] === d || discordIds[y] === d) {
            hasDuplicates = true;
          }
        });

        // eslint-disable-next-line max-len
        const currentSum = objects[i][valueKey] + objects[j][valueKey] + objects[k][valueKey];

        // eslint-disable-next-line max-len
        if (!hasDuplicates && Math.abs(currentSum - averageRank) < Math.abs(result.sumA - averageRank)) {
          result.sumA = currentSum;
          result.A = [objects[i], objects[j], objects[k]];
        }
      }
    }
  }

  objects.forEach((o) => {
    const pos = result.A.find((r) => r.discordId === o.discordId);

    if (!pos) {
      result.B.push(o);
    }
  });

  result.sumB = rankSum - result.sumA;

  return result;
}

module.exports = optimalPartition3;

/**
 * Array partitioning with brute force selecting optimal partition (4 vs. 4)
 * @param objects
 * @param partitionSize
 * @param valueKey
 * @returns Object
 */
function optimalPartition4(objects, partitionSize, valueKey) {
  const result = {
    A: [],
    B: [],
    sumA: 0,
    sumB: 0,
  };

  let rankSum = 0;
  objects.forEach((a) => {
    rankSum += a[valueKey];
  });

  const averageRank = rankSum / 2;
  result.sumA = rankSum;

  /* iterate over all possible partitions */
  const n = objects.length;

  // eslint-disable-next-line guard-for-in
  for (let i = 0; i < n - 3; i += 1) {
    // eslint-disable-next-line guard-for-in
    for (let j = i; j < n - 2; j += 1) {
      // eslint-disable-next-line guard-for-in
      for (let k = j; k < n - 1; k += 1) {
        // eslint-disable-next-line guard-for-in
        for (let l = k; l < n; l += 1) {
          // eslint-disable-next-line max-len
          const discordIds = [
            objects[i].discordId,
            objects[j].discordId,
            objects[k].discordId,
            objects[l].discordId,
          ];

          let hasDuplicates = false;
          discordIds.sort().forEach((d, x) => {
            const w = x - 1;
            const y = x + 1;

            if (discordIds[w] === d || discordIds[y] === d) {
              hasDuplicates = true;
            }
          });

          // eslint-disable-next-line max-len
          const currentSum = objects[i][valueKey] + objects[j][valueKey] + objects[k][valueKey] + objects[l][valueKey];

          // eslint-disable-next-line max-len
          if (!hasDuplicates && Math.abs(currentSum - averageRank) < Math.abs(result.sumA - averageRank)) {
            result.sumA = currentSum;
            result.A = [objects[i], objects[j], objects[k], objects[l]];
          }
        }
      }
    }
  }

  objects.forEach((o) => {
    const pos = result.A.find((r) => r.discordId === o.discordId);

    if (!pos) {
      result.B.push(o);
    }
  });

  result.sumB = rankSum - result.sumA;

  return result;
}

module.exports = {
  optimalPartition3,
  optimalPartition4,
};
