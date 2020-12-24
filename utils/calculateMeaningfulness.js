/**
 * Returns meaningfulness
 * @param reference
 * @param count
 * @param decay
 * @return Number
 */
function calculateMeaningfulness(reference, count, decay) {
  if (count >= reference) {
    return 1;
  }

  const meaningfulness = (1 - (decay * (reference - count)));
  return Number(meaningfulness.toFixed(2));
}

module.exports = calculateMeaningfulness;
