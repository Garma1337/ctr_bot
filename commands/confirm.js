const bot = require('../bot');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'confirm',
  description: 'Confirm.',
  noHelp: true,
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message) {
    const { confirmations } = bot;

    const authorId = message.author.id;
    if (!confirmations.has(authorId)) {
      return sendAlertMessage(message.channel, 'You don\'t have anything to confirm!', 'warning');
    }

    const userConfirmation = confirmations.get(authorId);
    if (!userConfirmation) {
      return sendAlertMessage(message.channel, 'You don\'t have anything to confirm!', 'warning');
    }

    const command = userConfirmation.get('command');
    if (command) {
      userConfirmation.delete('command');
      const c = message.client.commands.get(command);
      return c.confirm(message);
    }

    return sendAlertMessage(message.channel, 'You don\'t have anything to confirm!', 'warning');
  },
};
