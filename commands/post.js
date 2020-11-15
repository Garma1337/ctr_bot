const Discord = require('discord.js');
const formatRolePings = require('../utils/formatRolePings');

module.exports = {
  name: 'post',
  description: 'Post message in channels.',
  args: true,
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message, args) {
    const server = message.guild;

    const post = formatRolePings(message.content.split('\n').slice(1).join('\n'), message.guild.roles.cache);

    const attachment = message.attachments.first();
    const attachments = [];
    if (attachment) {
      attachments.push(attachment.url);
    }

    const promises = args.map((channelName) => {
      let channel;
      if (channelName.match(Discord.MessageMentions.CHANNELS_PATTERN)) {
        channel = message.mentions.channels.first();
      } else {
        channelName = channelName.replace(/^#/, '');
        channel = message.guild.channels.cache.find((c) => c.name === channelName);
      }

      if (!channel) {
        if (channelName.match(/\d\*/)) {
          const prefix = channelName[0];
          const channels = server.channels.cache.filter((c) => c.name.startsWith(prefix));
          if (channels.size) {
            channels.cache.forEach((c) => c.send(post, { files: attachments }));
            return;
          }
        }
        return message.channel.send(`Couldn't find channel ${channelName}`);
      }
      return channel.send(post, { files: attachments });
    });

    Promise.all(promises).then(() => {
      message.channel.send('Done');
    });
  },
};
