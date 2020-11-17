/**
 * Returns a random array element
 * @param array
 * @returns {*}
 */
function getRandomElement(array) {
  const randomKey = Math.floor((array.length - 1) * Math.random());
  return array[randomKey];
}

module.exports = getRandomElement;
