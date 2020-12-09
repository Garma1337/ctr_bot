const Discord = require('discord.js');
const sendAlertMessage = require('./sendAlertMessage');

module.exports = function findBotsMessages(message, numberOfPost, channelNames, callback) {
  const { client } = message;

  return channelNames.map((channelName) => {
    let channel;

    if (channelName.match(Discord.MessageMentions.CHANNELS_PATTERN)) {
      channel = message.mentions.channels.first();
    } else {
      channelName = channelName.replace(/^#/, '');
      channel = message.guild.channels.cache.find((c) => c.name === channelName);
    } if (!channel) {
      return sendAlertMessage(message.channel, `Can't find channel "${channelName}".`, 'error');
    }

    return channel.messages.fetch({ limit: 100 }).then((messages) => {
      let count = 0;
      const result = messages.some((msg) => {
        if (msg.author.id === client.user.id) {
          count += 1;
          if (count === numberOfPost) {
            return callback(msg);
          }
        }
        return false;
      });

      if (!result) {
        return sendAlertMessage(message.channel, `I couldn't find my message in "${channelName}".`, 'error');
      }

      return result;
    });
  });
};
