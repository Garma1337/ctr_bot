const config = require('../config');

/**
 * Returns if a member is a supporter (donator or server booster)
 * @param member
 * @returns boolean
 */
function isServerSupporter(member) {
  if (!member) {
    return false;
  }

  // eslint-disable-next-line max-len
  const supporterRole = member.roles.cache.find((r) => [config.roles.donator_role, config.roles.nitro_booster_role].includes(r.name));
  return !!supporterRole;
}

module.exports = isServerSupporter;
