/**
 * Array partitioning with a slightly modified greedy algorithm
 * @param objects
 * @param partitionSize
 * @param valueKey
 * @returns Object
 */
function greedyPartition(objects, partitionSize, valueKey) {
  const result = {
    A: [],
    B: [],
    sumA: 0,
    sumB: 0,
  };

  objects.forEach((a) => {
    // eslint-disable-next-line max-len
    if ((result.sumA < result.sumB && result.A.length < partitionSize) || result.B.length >= partitionSize) {
      result.A.push(a);
      result.sumA += a[valueKey];
    } else {
      result.B.push(a);
      result.sumB += a[valueKey];
    }
  });

  return result;
}

module.exports = greedyPartition;
