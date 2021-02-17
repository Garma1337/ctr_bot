const config = require('../config');
const { RankedBan } = require('../db/models/ranked_ban');
const findMember = require('../utils/findMember');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'ranked_unban',
  description: 'Ranked unban',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  // eslint-disable-next-line consistent-return
  async execute(message, args) {
    if (args.length) {
      const argument = args.shift();
      let member = message.mentions.users.first();
      if (!member) {
        try {
          member = await findMember(message.guild, argument);
        } catch (error) {
          return sendAlertMessage(message.channel, error.message, 'error');
        }
      }

      // eslint-disable-next-line consistent-return
      RankedBan.findOne({ guildId: message.guild.id, discordId: member.id }).then((doc) => {
        if (!doc) {
          return sendAlertMessage(message.channel, 'Banned user not found.', 'warning');
        }

        const promises = [];

        const docDeletePromise = doc.delete();
        promises.push(docDeletePromise);

        // eslint-disable-next-line max-len
        const channel = message.guild.channels.cache.find((c) => c.name === config.channels.ranked_lobbies_channel);
        const permissionOverwrites = channel.permissionOverwrites.get(doc.discordId);
        if (permissionOverwrites) {
          const permissionDeletePromise = permissionOverwrites.delete();
          promises.push(permissionDeletePromise);
        }

        const msg = sendAlertMessage(message.channel, '...', 'info');

        Promise.all([msg, ...promises]).then(([m]) => {
          m.delete();
          sendAlertMessage(message.channel, `${member} was unbanned from ranked lobbies.`, 'success');
        });
      });
    }
  },
};
