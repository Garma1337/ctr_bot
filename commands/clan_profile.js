const Clan = require('../db/models/clans').default;
const isStaffMember = require('../utils/isStaffMember');

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
      return message.channel.send('Wrong command usage. Use `!clan_profile help` to get help with the command.');
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
        return message.channel.send(`The clan "${clan}" does not exist.`);
      }

      const isStaff = isStaffMember(message.member);

      if (!playerClans.find((pc) => pc.toLowerCase() === clan.toLowerCase()) && !isStaff) {
        return message.channel.send(`You are not a captain of "${clan}".`);
      }

      switch (action) {
        case 'set_color':
          Clan.updateOne({ shortName: clan }, { color: parseInt(value, 16) }).exec();
          message.channel.send('The embed color has been updated.');
          break;
        case 'set_description':
          Clan.updateOne({ shortName: clan }, { description: value }).exec();
          message.channel.send('The clan description has been updated.');
          break;
        case 'set_logo':
          if (!isValidUrl(value)) {
            return message.channel.send(`The url "${value}" is invalid.`);
          }

          Clan.updateOne({ shortName: clan }, { logo: value }).exec();
          message.channel.send('The clan logo has been updated.');
          break;
        case 'set_discord':
          Clan.updateOne({ shortName: clan }, { discord: value }).exec();
          message.channel.send('The clan discord invite has been updated.');
          break;
        default:
          return message.channel.send(`The action "${action}" does not exist.`);
      }

      return true;
    });

    return true;
  },
};
