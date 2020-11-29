const moment = require('moment');
const Ban = require('../db/models/bans');
const createPageableContent = require('../utils/createPageableContent');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'bans',
  description: 'bans',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message) {
    message.guild.fetchBans()
      .then(async (banned) => {
        const list = [];

        for (const ban of banned.array()) {
          const { user } = ban;
          const item = [user.id, user.tag, ban.reason || 'No reason provided'];

          const banInfo = await Ban.findOne({ discordId: user.id });
          if (banInfo) {
            const durationLeft = moment(banInfo.bannedTill).fromNow();
            item.push(`Unban ${durationLeft}`);
          } else {
            item.push('Manual');
          }

          list.push(item.join(' | '));
        }

        if (banned.size > 0) {
          createPageableContent(message.channel, message.author.id, {
            outputType: 'embed',
            elements: list,
            elementsPerPage: 10,
            embedOptions: { heading: `${banned.size} users are banned` },
          });
        } else {
          return sendAlertMessage(message.channel, 'There are no bans ... yet.', 'info');
        }
      }).catch(() => {
        sendAlertMessage(message.channel, 'Failed to fetch the list of bans.', 'error');
      });
  },
};
