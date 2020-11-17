const getSignupsCount = require('../utils/getSignupsCount');

module.exports = {
  name: 'signups_count',
  description: 'Counts signups',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  async execute(message, args, guild = null) {
    if (message) {
      // eslint-disable-next-line no-param-reassign
      message = await message.reply('wait...');
    }

    let server;
    if (guild) {
      server = guild;
    } else {
      server = message.guild;
    }

    const { channels } = server;
    const channel = channels.cache.find((c) => c.name === 'signups');

    getSignupsCount(channel).then((count) => {
      if (message) {
        message.edit(`Signups count: ${count}`);
      }
    });
  },
};
