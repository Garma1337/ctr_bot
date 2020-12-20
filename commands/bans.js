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
    message.guild.fetchBans().then(async (banned) => {
      const list = [];

      let counter = 1;
      for (const ban of banned.array()) {
        const { user } = ban;
        const banInfo = await Ban.findOne({ discordId: user.id });

        let durationLeft = null;
        if (banInfo) {
          durationLeft = moment(banInfo.bannedTill).fromNow();
        }

        const out = `**${counter}**. ${user.tag}\n**Discord ID**: ${user.id}\n**Reason**: ${ban.reason || 'No reason'}\n**Duration**: ${durationLeft || 'Forever'}\n`;
        list.push(out);

        counter += 1;
      }

      if (banned.size > 0) {
        createPageableContent(message.channel, message.author.id, {
          outputType: 'embed',
          elements: list,
          elementsPerPage: 5,
          embedOptions: { heading: `${banned.size} users are banned` },
        });
      } else {
        return sendAlertMessage(message.channel, 'There are no bans yet.', 'info');
      }
    }).catch(() => {
      sendAlertMessage(message.channel, 'Failed to fetch the list of bans.', 'error');
    });
  },
};
