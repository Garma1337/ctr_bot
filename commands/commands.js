const { Command } = require('../db/models/command');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'commands',
  description: 'Create, edit, delete dynamic commands.',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  aliases: ['command'],
  execute(message, args) {
    if (args.length === 0) {
      Command.find().then((docs) => {
        if (docs.length) {
          const commands = docs.map((doc) => `!${doc.name}`).join('\n');
          return sendAlertMessage(message.channel, `List of dynamic commands:\n${commands}`, 'info');
        }

        return sendAlertMessage(message.channel, 'There are no dynamic commands.', 'info');
      });

      return;
    }

    const action = args[0];
    const filter = (m) => m.author.id === message.author.id;
    const options = { max: 1, time: 60000, errors: ['time'] };

    const ADD = 'add';
    const EDIT = 'edit';
    const DELETE = 'delete';
    const actions = [ADD, EDIT, DELETE];
    if (!actions.includes(action)) {
      // eslint-disable-next-line consistent-return
      return sendAlertMessage(message.channel, `Wrong action. Allowed actions: ${actions.join(', ')}`, 'warning');
    }

    const { client } = message;
    const commandName = args[1];
    switch (action) {
      case ADD:
        if (args.length < 2) {
          // eslint-disable-next-line consistent-return
          return sendAlertMessage(message.channel, 'Wrong amount of arguments. Example: `!commands add name`', 'warning');
        }

        // eslint-disable-next-line no-case-declarations
        const staticCommand = client.commands.get(commandName)
          || client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName));
        if (staticCommand) {
          // eslint-disable-next-line consistent-return
          return sendAlertMessage(message.channel, 'There is already a static command with that name!', 'warning');
        }

        sendAlertMessage(message.channel, `Send a response message for this command. Waiting 1 minute.
Type \`cancel\` to cancel.`, 'info').then(() => {
          message.channel.awaitMessages(filter, options).then((collected) => {
            const { content } = collected.first();

            if (content.toLowerCase() === 'cancel') {
              throw new Error('cancel');
            }

            // eslint-disable-next-line consistent-return
            Command.findOne({ name: commandName }).then((command) => {
              if (command) {
                return sendAlertMessage(message.channel, 'There is already a dynamic command with that name!', 'warning');
              }
              const newCommand = new Command();
              newCommand.name = commandName;
              newCommand.message = content;
              newCommand.save().then(() => {
                sendAlertMessage(message.channel, 'Command added.', 'success');
              });
            });
          }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
        });

        break;
      case EDIT:
        if (args.length < 2) {
          // eslint-disable-next-line consistent-return
          return sendAlertMessage(message.channel, 'Wrong amount of arguments. Example: `!commands edit name`', 'warning');
        }

        Command.findOne({ name: commandName }).then((command) => {
          if (command) {
            sendAlertMessage(message.channel, `Send a new response message for this command. Waiting 1 minute.
Type \`cancel\` to cancel.`, 'info').then(() => {
              message.channel.awaitMessages(filter, options).then((collected) => {
                const { content } = collected.first();

                if (content.toLowerCase() === 'cancel') {
                  throw new Error('cancel');
                }

                // eslint-disable-next-line no-param-reassign
                command.message = content;
                command.save().then(() => {
                  sendAlertMessage(message.channel, 'Command edited.', 'success');
                });
              }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
            });
          } else {
            sendAlertMessage(message.channel, 'There is no dynamic command with that name.', 'warning');
          }
        });

        break;

      case DELETE:
        if (args.length < 2) {
          // eslint-disable-next-line consistent-return
          return sendAlertMessage(message.channel, 'Wrong amount of arguments. Example: `!commands delete name`', 'warning');
        }

        Command.findOne({ name: commandName }).then((command) => {
          if (command) {
            sendAlertMessage(message.channel, 'Are you sure you want to delete this command? `(yes / no)`. Waiting 1 minute.', 'info').then(() => {
              message.channel.awaitMessages(filter, options).then((collected) => {
                const { content } = collected.first();

                if (content.toLowerCase() === 'yes') {
                  command.delete().then(() => {
                    sendAlertMessage(message.channel, 'Command deleted.', 'success');
                  });
                } else {
                  throw Error('cancel');
                }
              }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
            });
          } else {
            sendAlertMessage(message.channel, 'There is no dynamic command with that name.', 'warning');
          }
        });

        break;
      default:
        break;
    }
  },
};
