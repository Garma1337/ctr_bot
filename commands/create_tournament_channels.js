const config = require('../config');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'create_tournament_channels',
  description: 'Creating tournament channels with roles.',
  args: true,
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message, args) {
    const { guild } = message;
    const category = guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.tournament_lobbies_category && c.type === 'category');

    const outMessageRows = [];

    args.forEach((name) => {
      // eslint-disable-next-line no-param-reassign
      name = name.toLowerCase();
      outMessageRows.push(`Creating role @${name} ...`);
      outMessageRows.push(`Creating channel #${name} ...`);
      guild.roles.create({ data: { name } })
        .then((role) => {
          guild.channels.create(name, {
            type: 'text',
            parent: category,
          }).then(async (c) => {
            await c.lockPermissions();
            await c.createOverwrite(role, {
              VIEW_CHANNEL: true,
            });
            await role.edit({ mentionable: true });
          }).catch((e) => {
            sendAlertMessage(message.channel, `\`${e.name}: ${e.message}\``, 'error');
          });
        }).catch((e) => {
          sendAlertMessage(message.channel, `\`${e.name}: ${e.message}\``, 'error');
        });
    });

    sendAlertMessage(message.channel, outMessageRows.join('\n'), 'success');
  },
};
