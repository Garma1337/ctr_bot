/**
 * Returns an array containing incrementing numbers inside a range
 * @param start
 * @param end
 * @returns Array
 */
function getRangeArray(start, end) {
  return Array(end - start + 1).fill().map((_, idx) => start + idx);
}

/**
 * Array partitioning with brute force selecting optimal partition
 * @param objects
 * @param partitionSize
 * @param valueKey
 * @returns Object
 */
function optimalPartition(objects, partitionSize, valueKey) {
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
  for (const i in getRangeArray(0, n - 3)) {
    // eslint-disable-next-line guard-for-in
    for (const j in getRangeArray(i, n - 2)) {
      // eslint-disable-next-line guard-for-in
      for (const k in getRangeArray(j, n - 1)) {
        // eslint-disable-next-line guard-for-in
        for (const l in getRangeArray(k, n)) {
          // eslint-disable-next-line max-len
          const currentSum = objects[i][valueKey] + objects[j][valueKey] + objects[k][valueKey] + objects[l][valueKey];

          if (Math.abs(currentSum - averageRank) < Math.abs(result.sumA - averageRank)) {
            result.sumA = currentSum;
            result.A = [i, j, k, l];
          }
        }
      }
    }
  }

  objects.forEach((o, i) => {
    if (!result.A[i]) {
      result.B.push(o);
    }
  });

  result.sumB = rankSum - result.sumA;

  return result;
}

module.exports = optimalPartition;
