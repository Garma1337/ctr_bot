const config = require('../config');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'stop',
  description: 'STOP',
  noHelp: true,
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message) {
    if (!(message.member && message.member.roles.cache.find((r) => r.name.toLowerCase() === config.roles.admin_role.toLowerCase())) && message.author.id !== config.owner) {
      const adminRole = message.guild.roles.cache.find((r) => r.name.toLowerCase() === config.roles.admin_role.toLowerCase());
      return sendAlertMessage(message.channel, `You should have the role ${adminRole} to use this command!`, 'warning');
    }

    // eslint-disable-next-line no-param-reassign
    message.client.stop = true;
    return sendAlertMessage(message.channel, 'you stopped me :slight_frown:', 'success');
  },
};
