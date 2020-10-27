const Clan = require('../db/models/clans');

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
\`!clan_profile GSC set_color 1871d4\`
\`!clan_profile GSC set_description Our clan is very cool ah yes imagine\`
\`!clan_profile GSC set_logo https://www.domain.com/logo.png\`
\`!clan_profile GSC set_discord https://discord.gg/abcd123\``);
    }

    if (args.length < 3) {
      return message.channel.send('Wrong command usage. Use `!clan_profile help` to get help with the command.');
    }

    const isStaff = message.member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES']);
    const captainRole = message.member.roles.cache.find((r) => r.name.toLowerCase() === 'captain');

    if (!captainRole && !isStaff) {
      return message.channel.send('You need to be a captain to use this command.');
    }

    const clan = args.shift();
    const action = args.shift();
    const value = args.join(' ');

    Clan.find().then((clans) => {
      const playerClans = [];

      clans.forEach((c) => {
        const clanRole = message.member.roles.cache.find((r) => r.name.toLowerCase() === c.fullName.toLowerCase());

        if (clanRole) {
          playerClans.push(c.shortName);
        }
      });

      if (!playerClans.find((pc) => pc === clan) && !isStaff) {
        return message.channel.send(`You are not a member of ${clan}.`);
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
          return message.channel.send(`Action "${action}" does not exist.`);
      }

      return true;
    });

    return true;
  },
};
