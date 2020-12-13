const bot = require('../bot');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'cancel',
  description: 'Cancel.',
  noHelp: true,
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message) {
    const { confirmations } = bot;

    const authorId = message.author.id;
    if (!confirmations.has(authorId)) {
      return sendAlertMessage(message.channel, 'You don\'t have anything to cancel!', 'warning');
    }

    const userConfirmation = confirmations.get(authorId);
    if (!userConfirmation) {
      return sendAlertMessage(message.channel, 'You don\'t have anything to cancel!', 'warning');
    }

    const command = userConfirmation.get('command');
    if (command) {
      userConfirmation.delete('command');
      return sendAlertMessage(message.channel, `You cancelled \`${command}\``, 'success');
    }

    return sendAlertMessage(message.channel, 'You don\'t have anything to cancel!', 'warning');
  },
};
