const Player = require('../db/models/player');
const { timeZones } = require('../utils/timeZones');

module.exports = {
  name: 'set_time_zone',
  description: 'Set your time zone.',
  guildOnly: true,
  execute(message, args) {
    const regions = Object.keys(timeZones);

    return message.channel.send(`Please select your region. Waiting 1 minute.
\`\`\`${regions.map((r, i) => `${i + 1} - ${r}`).join('\n')}\`\`\`
    `).then((confirmMessage) => {
      const filter = (m) => m.author.id === message.author.id;
      const options = { max: 1, time: 60000, errors: ['time'] };

      message.channel.awaitMessages(filter, options).then((collectedMessages) => {
        const collectedMessage = collectedMessages.first();
        const { content } = collectedMessage;

        confirmMessage.delete();
        collectedMessage.delete();

        const region = regions[content - 1] || null;
        if (region) {
          const regionTimeZones = timeZones[region];

          return message.channel.send(`Please select your time zone. Waiting 1 minute.
\`\`\`${regionTimeZones.map((t, i) => `${i + 1} - ${t}`).join('\n')}\`\`\`
          `).then((confirmMessage) => {
            message.channel.awaitMessages(filter, options).then((collectedMessages) => {
              const collectedMessage = collectedMessages.first();
              const { content } = collectedMessage;

              confirmMessage.delete();
              collectedMessage.delete();

              const timeZone = regionTimeZones[content - 1] || null;

              if (timeZone) {
                Player.updateOne({ discordId: message.author.id }, { timeZone }).exec();
                message.channel.send(`Your time zone has been set to ${timeZone}.`);
              } else {
                message.channel.send('Command canceled.');
              }
            });
          }).catch(() => message.channel.send('Command canceled.'));
        }
        message.channel.send('Command canceled.');
      });
    }).catch(() => message.channel.send('Command canceled.'));
  },
};
