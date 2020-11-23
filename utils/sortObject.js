/**
 * Sorts an object based on its keys
 * @param object
 * @returns {{}}
 */
function sortObject(object) {
  return Object.fromEntries(Object.entries(object).sort(([, a], [, b]) => b - a));
}

module.exports = sortObject;
