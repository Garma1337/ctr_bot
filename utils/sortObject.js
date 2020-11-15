/**
 * Sorts an object based on its keys
 * @param object
 * @returns {{}}
 */
function sortObject(object) {
  const ordered = {};
  Object.keys(object).sort().forEach((key) => {
    ordered[key] = object[key];
  });

  return ordered;
}

module.exports = sortObject;
