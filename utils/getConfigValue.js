const { Config } = require('../db/models/config');

/**
 * Returns a config value from the database
 * @param configName
 * @param defaultValue
 * @returns String
 */
async function getConfigValue(configName, defaultValue = null) {
  let config = await Config.findOne({ name: configName });
  if (!config) {
    config = new Config();
    config.name = configName;
    config.value = defaultValue;
    config.editable = true;

    config.save().then(() => {
      // eslint-disable-next-line no-console
      console.log(`Created new config value: ${configName}`);
    });
  }

  return config.value;
}

module.exports = getConfigValue;
