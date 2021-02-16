const { Player } = require('../db/models/player');
const sendAlertMessage = require('../utils/sendAlertMessage');
const { timeZones } = require('../db/timeZones');

module.exports = {
  name: 'set_time_zone',
  description: 'Set your time zone.',
  guildOnly: true,
  aliases: ['set_tz'],
  execute(message) {
    const regions = Object.keys(timeZones);

    return sendAlertMessage(message.channel, `Please select your region. Waiting 1 minute.\n
\`\`\`${regions.map((r, i) => `${i + 1} - ${r}`).join('\n')}\`\`\``, 'info').then((confirmMessage) => {
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

          return sendAlertMessage(message.channel, `Please select your time zone. Waiting 1 minute.\n
\`\`\`${regionTimeZones.map((t, i) => `${i + 1} - ${t}`).join('\n')}\`\`\``, 'info').then((confirmMessage) => {
            message.channel.awaitMessages(filter, options).then((collectedMessages) => {
              const collectedMessage = collectedMessages.first();
              const { content } = collectedMessage;

              confirmMessage.delete();
              collectedMessage.delete();

              const timeZone = regionTimeZones[content - 1] || null;

              if (timeZone) {
                Player.findOne({ discordId: message.author.id }).then((player) => {
                  if (!player) {
                    player = new Player();
                    player.discordId = message.author.id;
                  }

                  player.timeZone = timeZone;
                  player.save().then(() => {
                    sendAlertMessage(message.channel, `Your time zone has been set to \`${timeZone}\`.`, 'success');
                  }).catch((error) => {
                    sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
                  });
                });
              } else {
                sendAlertMessage(message.channel, 'Command cancelled.', 'error');
              }
            });
          }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
        }
        sendAlertMessage(message.channel, 'Command cancelled.', 'error');
      });
    }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
  },
};
