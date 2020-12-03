/**
 * Returns a random array element
 * @param array
 * @returns {*}
 */
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

module.exports = getRandomElement;
