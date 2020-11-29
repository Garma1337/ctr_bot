const Clan = require('../db/models/clans').default;
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');

/**
 * Checks if a string is a valid URL
 * @param string
 * @returns {boolean}
 */
function isValidUrl(string) {
  try {
    const url = new URL(string);

    return true;
  } catch (_) {
    return false;
  }
}

module.exports = {
  name: 'clan_profile',
  usage: '[clan] [action] [value]',
  description: 'Edit your clan profile.',
  guildOnly: true,
  aliases: ['cp'],
  execute(message, args) {
    if (args[0] === 'help') {
      return message.channel.send(`To edit your clan profile you can use the following commands:
\`!clan_profile [clan] set_color 1871d4\`
\`!clan_profile [clan] set_description [description]\`
\`!clan_profile [clan] set_logo https://www.domain.com/logo.png\`
\`!clan_profile [clan] set_discord https://discord.gg/abcd123\``);
    }

    if (args.length < 3) {
      return sendAlertMessage(message.channel, 'Wrong command usage. Use `!clan_profile help` to get help with the command.', 'warning');
    }

    const clan = args.shift();
    const action = args.shift().toLowerCase();
    const value = args.join(' ');

    Clan.find().then((clans) => {
      let clanExists = false;
      const playerClans = [];

      clans.forEach((c) => {
        if (c.shortName.toLowerCase() === clan.toLowerCase()) {
          clanExists = true;

          if (c.hasCaptain(message.author.id)) {
            playerClans.push(c.shortName);
          }
        }
      });

      if (!clanExists) {
        return sendAlertMessage(message.channel, `The clan "${clan}" does not exist.`, 'warning');
      }

      const isStaff = isStaffMember(message.member);

      if (!playerClans.find((pc) => pc.toLowerCase() === clan.toLowerCase()) && !isStaff) {
        return sendAlertMessage(message.channel, `You are not a captain of "${clan}".`, 'warning');
      }

      switch (action) {
        case 'set_color':
          Clan.updateOne({ shortName: clan }, { color: parseInt(value, 16) }).exec();
          sendAlertMessage(message.channel, 'The embed color has been updated.', 'success');
          break;
        case 'set_description':
          Clan.updateOne({ shortName: clan }, { description: value }).exec();
          sendAlertMessage(message.channel, 'The clan description has been updated.', 'success');
          break;
        case 'set_logo':
          if (!isValidUrl(value)) {
            return sendAlertMessage(message.channel, `The url "${value}" is invalid.`, 'warning');
          }

          Clan.updateOne({ shortName: clan }, { logo: value }).exec();
          sendAlertMessage(message.channel, 'The clan logo has been updated.', 'success');
          break;
        case 'set_discord':
          Clan.updateOne({ shortName: clan }, { discord: value }).exec();
          sendAlertMessage(message.channel, 'The clan discord invite has been updated.', 'success');
          break;
        default:
          return sendAlertMessage(message.channel, `The action "${action}" does not exist.`, 'warning');
      }

      return true;
    });

    return true;
  },
};
