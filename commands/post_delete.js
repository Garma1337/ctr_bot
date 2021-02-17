const Discord = require('discord.js');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'post_delete',
  description: 'Delete post message in channels.',
  args: true,
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message, args) {
    // noinspection DuplicatedCode
    const { client } = message;

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

    // eslint-disable-next-line array-callback-return,consistent-return
    const promises = channelNames.map((channelName) => {
      let channel;

      if (channelName.match(Discord.MessageMentions.CHANNELS_PATTERN)) {
        channel = message.mentions.channels.first();
      } else {
        channelName = channelName.replace(/^#/, '');
        channel = message.guild.channels.cache.find((c) => c.name === channelName);
      } if (!channel) {
        return sendAlertMessage(message.channel, `Couldn't find channel ${channelName}.`, 'warning');
      }

      channel.messages.fetch({ limit: 100 }).then((messages) => {
        let count = 0;
        const result = messages.some((msg) => {
          if (msg.author.id === client.user.id) {
            count += 1;
            if (count === numberOfPost) {
              return msg.delete();
            }
          }
          return false;
        });

        if (!result) {
          return sendAlertMessage(messages.channel, `I didn't find my message in ${channelName}.`, 'warning');
        }

        return result;
      });
    });

    Promise.all(promises).then(() => {
      sendAlertMessage(message.channel, 'Done.', 'success');
    });
  },
};
