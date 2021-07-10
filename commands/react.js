const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'react',
  description: 'React to a message with an emote using the bot',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  args: true,
  aliases: ['add_reaction', 'reaction_add'],
  // eslint-disable-next-line consistent-return
  execute(message, args) {
    if (args.length < 2) {
      return sendAlertMessage(message.channel, 'You need to enter a message and an emote.', 'warning');
    }

    const messageId = args[0];
    const emote = args[1];

    // eslint-disable-next-line consistent-return
    message.channel.messages.fetch(messageId).then((fetchedMessage) => {
      const fetchedEmote = message.guild.emojis.resolveID(emote);
      if (!fetchedEmote) {
        return sendAlertMessage(message.channel, `The emote ${emote} does not exist.`, 'warning');
      }

      fetchedMessage.react(emote)
        .then(() => sendAlertMessage(message.channel, `The reaction ${emote} was added to the message \`${messageId}\`.`, 'success'))
        .catch(() => {
          sendAlertMessage(message.channel, `Unable to react to the message \`${messageId}\` with the emote ${emote}. Are you sure the message exists and the emote is valid?`, 'warning');
        });
    });
  },
};
