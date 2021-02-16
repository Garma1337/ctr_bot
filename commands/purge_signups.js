const { SignupsChannel } = require('../db/models/signups_channel');
const fetchMessages = require('../utils/fetchMessages');
const sendAlertMessage = require('../utils/sendAlertMessage');

const limit = 500;

module.exports = {
  name: 'purge_signups',
  description: `Delete last ${limit} messages in the specified channel.`,
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  async execute(message) {
    const channel = message.mentions.channels.first();
    if (!channel) {
      return sendAlertMessage(message.channel, 'You need to mention a channel.', 'warning');
    }

    const signupsChannel = await SignupsChannel.findOne({ channel: channel.id });
    if (!signupsChannel) {
      return sendAlertMessage(message.channel, `The channel <#${channel.id}> is not a signups channel.`, 'warning');
    }

    return sendAlertMessage(message.channel, `This command will delete **all** messages in ${channel} channel.
Say \`confirm\` to confirm. Waiting 10 seconds.`, 'warning').then((confirmMessage) => {
      message.channel.awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 10000, errors: ['time'] })
        .then((collected) => {
          const { content } = collected.first();
          if (content.toLowerCase() === 'confirm') {
            fetchMessages(channel, limit).then((messages) => {
              sendAlertMessage(message.channel, `Found ${messages.length} messages. Deleting...`, 'info').then((deletingMessage) => {
                deletingMessage.delete();

                const deletedCallback = () => {
                  sendAlertMessage(message.channel, `All messages in ${channel} have been deleted.`, 'success');
                };

                channel.bulkDelete(messages)
                  .then(deletedCallback)
                  .catch((error) => {
                    sendAlertMessage(message.channel, `${error.toString()}\nDeleting one by one now instead. Might take a while.`, 'info');

                    const deletePromises = messages.map((m) => m.delete());
                    Promise.all(deletePromises).then(deletedCallback);
                  });
              });
            });
          } else {
            throw new Error('cancel');
          }
        }).catch(() => {
          confirmMessage.delete();
          sendAlertMessage(message.channel, 'Command cancelled.', 'error');
        });
    });
  },
};
