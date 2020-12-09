const Discord = require('discord.js');
const bot = require('../bot');
const config = require('../config');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'delete_tournament_channels',
  description: 'Delete tournament channels and roles.',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message) {
    const { confirmations } = bot;

    const authorId = message.author.id;
    if (!confirmations.has(authorId)) {
      confirmations.set(authorId, new Discord.Collection());
    }

    const userConfirmation = confirmations.get(authorId);
    const autoCancelSeconds = 10;

    const confirmationCommand = userConfirmation.get('command');
    if (confirmationCommand) {
      return sendAlertMessage(message.channel, `You need to confirm or cancel your previous command: ${confirmationCommand}`, 'warning');
    }

    sendAlertMessage(message.channel, `This command will delete all channels in \`Tournament Lobbies\` category and all roles with the same names!
Say \`!confirm\` to proceed, \`!cancel\` to cancel.
Command will be automatically cancelled after ${autoCancelSeconds} seconds.`, 'info');
    const commandName = 'delete_tournament_channels';
    userConfirmation.set('command', commandName);

    return setTimeout(() => {
      if (userConfirmation.get('command')) {
        userConfirmation.delete('command');
        return sendAlertMessage(message.channel, `Command \`${commandName}\` cancelled!`, 'error');
      }
      return null;
    }, autoCancelSeconds * 1000);
  },

  async confirm(message) {
    sendAlertMessage(message.channel, 'Processing...', 'info').then(async (botMsg) => {
      const channels = message.guild.channels.cache.filter((c) => c.parent && c.parent.name.toLowerCase() === config.channels.tournament_lobbies_category);

      const outMessageRows = [];

      /**
       * couldn't use await in iterable callback functions,
       * so using standard loops
       */

      // eslint-disable-next-line no-restricted-syntax
      for (const c of channels.array()) {
        try {
        // eslint-disable-next-line no-await-in-loop
          await c.delete();
          outMessageRows.push(`Removed channel #${c.name}`);

          const roles = message.guild.roles.cache.filter((r) => r.name === c.name);

          // eslint-disable-next-line no-restricted-syntax
          for (const r of roles.array()) {
            try {
            // eslint-disable-next-line no-await-in-loop
              await r.delete();
              outMessageRows.push(`Removing role @${c.name} ...`);
            } catch (e) {
              sendAlertMessage(message.channel, `\`${e.name}: ${e.message}\``, 'error');
              break;
            }
          }
        } catch (e) {
          sendAlertMessage(message.channel, `\`${e.name}: ${e.message}\``, 'error');
          break;
        }
      }

      await botMsg.delete();

      if (outMessageRows.length) {
        sendAlertMessage(message.channel, outMessageRows.join('\n'), 'success');
      } else {
        sendAlertMessage(message.channel, 'I think there is nothing to delete :slight_smile:', 'info');
      }
    });
  },
};
