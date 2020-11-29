const findBotsMessages = require('../utils/findBotsMessages');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'post_edit',
  description: 'Edit post message in channels.',
  args: true,
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
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
      channelNames = args.slice(1);
    }

    const newMessage = rows.join('\n');
    const promises = findBotsMessages(message, numberOfPost, channelNames, (msg) => msg.edit(newMessage));

    Promise.all(promises).then(() => {
      sendAlertMessage(message.channel, 'Done.', 'success');
    });
  },
};
