const Config = require('../db/models/config');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'config',
  description: 'Edit bot config.',
  guildOnly: true,
  permissions: ['MANAGE_ROLES'],
  aliases: ['command'],
  execute(message, args) {
    if (args.length === 0) {
      Config.find({ editable: { $ne: false } }).then((docs) => {
        if (docs.length) {
          const config = docs.map((doc) => `\`${doc.name}\``).join('\n');
          sendAlertMessage(message.channel, `Config variables:\n${config}`, 'info');
        }
      });

      return;
    }

    const action = args[0];

    const SHOW = 'show';
    const EDIT = 'edit';
    const actions = [SHOW, EDIT];

    if (!actions.includes(action)) {
      return sendAlertMessage(message.channel, `Wrong command action. Allowed actions: ${actions}`, 'warning');
    }

    if (args.length < 2) {
      return sendAlertMessage(message.channel, 'Wrong amount of arguments. Example: `!config edit name`', 'warning');
    }

    const configName = args[1];

    if (action === SHOW) {
      Config.findOne({ name: configName, editable: { $ne: false } }).then((config) => {
        if (config) {
          sendAlertMessage(message.channel, `The value of \`${configName}\` variable is:\n${config.value}`, 'info');
        } else {
          sendAlertMessage(message.channel, 'There is no config variable with that name.', 'warning');
        }
      });
    } else {
      Config.findOne({ name: configName, editable: { $ne: false } }).then((config) => {
        if (config) {
          message.channel.send(`Send a new value for \`${configName}\` variable. Waiting 1 minute.
Type \`cancel\` to cancel.`).then(() => {
            message.channel
              .awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 60000, errors: ['time'] })
              .then((collected) => {
                const { content } = collected.first();
                if (content.toLowerCase() === 'cancel') {
                  throw new Error('cancel');
                }

                // eslint-disable-next-line no-param-reassign
                config.value = content;
                config.save().then(() => {
                  sendAlertMessage(message.channel, 'Config variable edited.', 'success');
                });
              }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
          });
        } else {
          sendAlertMessage(message.channel, 'There is no config variable with that name.', 'warning');
        }
      });
    }
  },
};
