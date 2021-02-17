const findBotsMessages = require('../utils/findBotsMessages');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'post_pin',
  description: 'Pins post message in channels.',
  args: true,
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  // eslint-disable-next-line consistent-return
  execute(message, args) {
    let numberOfPost = Number(args[0]);
    let channelNames;

    const rows = message.content.split('\n');
    rows.shift();

    // eslint-disable-next-line no-restricted-globals
    if (isNaN(numberOfPost)) {
      numberOfPost = 1;
      channelNames = args;
    } else {
      channelNames = rows.shift().trim().split(/ +/);
    }

    if (channelNames.length === 1 && channelNames[0].match(/\d\*/)) {
      const channelName = channelNames[0];
      const prefix = channelName[0];
      const channels = message.guild.channels.cache.filter((c) => c.name.startsWith(prefix));
      if (channels.size) {
        channelNames = channels.map((c) => c.name);
      } else {
        return sendAlertMessage(message.channel, 'Error', 'error');
      }
    }

    const promises = findBotsMessages(message, numberOfPost, channelNames, (msg) => msg.pin());

    Promise.all(promises).then(() => {
      sendAlertMessage(message.channel, 'Done.', 'success');
    });
  },
};
