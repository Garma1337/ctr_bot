const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'purge',
  description: 'Delete last X messages in current channel.',
  guildOnly: true,
  permissions: ['MANAGE_MESSAGES'],
  args: true,
  usage: 'purge [X]',
  // eslint-disable-next-line consistent-return
  execute(message, args) {
    const limit = parseInt(args[0], 10);

    const LIMIT = 50;
    if (limit > LIMIT) {
      return sendAlertMessage(message.channel, `You cannot delete more than ${LIMIT} messages at once.`, 'warning');
    }

    const { channel } = message;

    channel.messages.fetch({
      before: message.id,
      limit,
    }).then((messages) => {
      const deletedCallback = () => {
        message.delete();
      };

      channel.bulkDelete(messages).then(deletedCallback).catch((error) => {
        sendAlertMessage(message.channel, `${error.toString()}\nDeleting one by one now instead. Might take a while...`, 'info').then((deletingMessage) => {
          const deletePromises = messages.map((m) => m.delete());
          Promise.all(deletePromises).then(deletedCallback).then(() => deletingMessage.delete());
        });
      });
    });
  },
};
