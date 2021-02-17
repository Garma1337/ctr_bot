/* eslint-disable consistent-return */
const { parsers } = require('../utils/signups_parsers');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'signups_templates',
  description: 'Manage signups channels',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  aliases: ['signups_template', 'signup_templates', 'signup_template'],
  execute(message) {
    const parserNames = Object.keys(parsers);
    const parsersString = parserNames.map((parser, i) => `${i + 1} - ${parser}`).join('\n');

    sendAlertMessage(message.channel, `Select the type of signups parser:\n${parsersString}`, 'info').then(async (confirmMessage) => {
      message.channel.awaitMessages(
        (m) => m.author.id === message.author.id,
        { max: 1, time: 60000, errors: ['time'] },
      ).then((collected) => {
        confirmMessage.delete();

        const collectedMessage = collected.first();
        const { content } = collectedMessage;
        collectedMessage.delete();

        const parserName = parserNames[+content - 1];
        if (!parserName) {
          throw new Error('cancel');
        }

        const parser = parsers[parserName];
        sendAlertMessage(message.channel, parser.template, 'success');
      }).catch(() => {
        sendAlertMessage(message.channel, 'Command cancelled.', 'error');
      });
    });
  },
};
