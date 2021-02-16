const moment = require('moment');
const { Player } = require('../db/models/player');
const sendAlertMessage = require('../utils/sendAlertMessage');

/**
 * Creates an array with a range of numbers
 * @param size
 * @param startAt
 * @returns {unknown[]}
 */
function range(size, startAt = 0) {
  return [...Array(size).keys()].map((i) => i + startAt);
}

module.exports = {
  name: 'set_birthday',
  description: 'Set your birthday.',
  guildOnly: true,
  execute(message, args) {
    if (args.length > 0 && args[0] === 'unset') {
      Player.findOne({ discordId: message.author.id }).then((player) => {
        if (!player) {
          player = new Player();
          player.discordId = message.author.id;
        }

        player.birthday = null;
        player.save().then(() => {
          sendAlertMessage(message.channel, 'Your birthday has been unset.', 'success');
        }).catch((error) => {
          sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
        });
      });

      return;
    }

    if (args.length > 0) {
      let birthdate = moment(args[0].trim());

      if (!birthdate.isValid()) {
        return sendAlertMessage(message.channel, `The date "${args[0]}" is invalid.`, 'warning');
      }

      birthdate = birthdate.format('YYYY-MM-DD');

      Player.findOne({ discordId: message.author.id }).then((player) => {
        if (!player) {
          player = new Player();
          player.discordId = message.author.id;
        }

        player.birthday = args[0];
        player.save().then(() => {
          sendAlertMessage(message.channel, `Your birthday has been set to ${args[0]}.`, 'success');
        }).catch((error) => {
          sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
        });
      });

      return;
    }

    const currentDate = new Date();

    const years = range(40, currentDate.getFullYear() - 50);
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const days = range(31, 1);

    return sendAlertMessage(message.channel, 'Please enter the year. The value must be between 1970 and 2010. Waiting 1 minute.', 'info').then((confirmMessage) => {
      const filter = (m) => m.author.id === message.author.id;
      const options = { max: 1, time: 60000, errors: ['time'] };

      message.channel.awaitMessages(filter, options).then((collectedMessages) => {
        const collectedMessage = collectedMessages.first();
        const { content } = collectedMessage;

        confirmMessage.delete();
        collectedMessage.delete();

        if (years.includes(Number(content))) {
          const year = content;

          return sendAlertMessage(message.channel, `Select month. Waiting 1 minute.\n
\`\`\`${months.map((m, i) => m = `${i + 1} - ${m}`).join('\n')}\`\`\``, 'info').then((confirmMessage) => {
            message.channel.awaitMessages(filter, options).then((collectedMessages) => {
              const collectedMessage = collectedMessages.first();
              const { content } = collectedMessage;

              confirmMessage.delete();
              collectedMessage.delete();

              if (range(12, 1).includes(Number(content))) {
                let month = content;

                if (month < 10) {
                  month = `0${month}`;
                }

                return sendAlertMessage(message.channel, 'Please enter the day. The value must be between 1 and 31. Waiting 1 minute.', 'info').then((confirmMessage) => {
                  message.channel.awaitMessages(filter, options).then((collectedMessages) => {
                    const collectedMessage = collectedMessages.first();
                    const { content } = collectedMessage;

                    confirmMessage.delete();
                    collectedMessage.delete();

                    if (days.includes(Number(content))) {
                      let day = content;

                      if (day < 10) {
                        day = `0${day}`;
                      }

                      const birthday = `${year}-${month}-${day}`;
                      const birthDate = moment(birthday);

                      if (!birthDate.isValid()) {
                        return sendAlertMessage(message.channel, `The date "${birthday}" is invalid.`, 'warning');
                      }

                      Player.findOne({ discordId: message.author.id }).then((player) => {
                        if (!player) {
                          player = new Player();
                          player.discordId = message.author.id;
                        }

                        player.birthday = birthday;
                        player.save().then(() => {
                          sendAlertMessage(message.channel, `Your birthday has been set to ${birthday}.`, 'success');
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
        }
        sendAlertMessage(message.channel, 'Command cancelled.');
      }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
    });
  },
};
