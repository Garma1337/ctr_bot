/**
 * Translates a language variable
 * @param languageVar
 * @param language
 * @returns String
 */
function translate(languageVar, language) {
  const fileName = `../lang/${language}`;

  const { variables } = require(fileName);

  let translation = variables[languageVar];
  if (!translation) {
    const { englishVariables } = require('../lang/english');
    translation = englishVariables[languageVar];
  }

  return translation || `Error: Missing language variable "${languageVar}".`;
}

module.exports = translate;
