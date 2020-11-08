const SignupsChannel = require('../db/models/signups_channels');
const fetchMessages = require('../utils/fetchMessages');

const limit = 500;

module.exports = {
  name: 'purge_signups',
  description: `Delete last ${limit} messages in the specified channel.`,
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  async execute(message) {
    if (!(message.member && message.member.roles.cache.find((r) => r.name === 'Admin'))) {
      const adminRole = message.guild.roles.cache.find((r) => r.name === 'Admin');
      return message.reply(`you should have a role ${adminRole} to use this command!`);
    }

    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.channel.send('You need to mention a channel.');
    }

    const signupsChannel = await SignupsChannel.findOne({ channel: channel.id });
    if (!signupsChannel) {
      return message.channel.send(`The channel <#${channel.id}> is not a signups channel.`);
    }

    return message.channel.send(`This command will delete **all** messages in ${channel} channel.
Say \`confirm\` to confirm. Waiting 10 seconds.`).then((confirmMessage) => {
      message.channel.awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 10000, errors: ['time'] })
        .then((collected) => {
          const { content } = collected.first();
          if (content.toLowerCase() === 'confirm') {
            fetchMessages(channel, limit).then((messages) => {
              message.channel.send(`Found ${messages.length} messages. Deleting...`).then((deletingMessage) => {
                const deletedCallback = () => {
                  deletingMessage.edit(`All messages in ${channel} have been deleted.`).then();
                };
                channel.bulkDelete(messages)
                  .then(deletedCallback)
                  .catch((error) => {
                    deletingMessage.edit(`${error.toString()}\nDeleting one by one now instead. Might take a while.`);
                    const deletePromises = messages.map((m) => m.delete());
                    Promise.all(deletePromises).then(deletedCallback);
                  });
              });
            });
          } else {
            throw new Error('cancel');
          }
        })
        .catch(() => confirmMessage.edit('Command cancelled.'));
    });
  },
};
