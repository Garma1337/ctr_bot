const Clan = require('../db/models/clans').default;
const { MEMBER_ROLES } = require('../db/models/clans');

module.exports = {
  name: 'clan_role',
  usage: '[member] [clan] [role]',
  description: 'Modify the role of a clan member. Example: `!clan_role @Garma GSC captain`.',
  guildOnly: true,
  aliases: ['cr'],
  execute(message, args) {
    if (args.length < 3) {
      return message.channel.send('Wrong command usage. Example: `!clan_role @Garma GSC captain`.');
    }

    const user = message.mentions.users.first();

    if (!user) {
      return message.channel.send('You need to mention a user.');
    }

    const clanName = args[1];
    const role = args[2].toLowerCase();

    Clan.find().then((clans) => {
      const clan = clans.find((c) => c.shortName.toLowerCase() === clanName.toLowerCase());
      if (!clan) {
        return message.channel.send(`The clan "${clanName}" does not exist.`);
      }

      const isStaff = message.member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES']);

      if (!clan.hasCaptain(message.author.id) && !isStaff) {
        return message.channel.send(`You are not a captain of "${clan}".`);
      }

      if (!clan.hasMember(user.id)) {
        return message.channel.send(`<@!${user.id}> is not a member of "${clanName}".`);
      }

      if (!MEMBER_ROLES.includes(role)) {
        return message.channel.send(`Invalid role "${role}". Available roles are ${MEMBER_ROLES.join(', ')}.`);
      }

      clan.setMemberRole(user.id, role);
      clan.save().then(() => message.channel.send(`Member role has been switched to ${role}.`));
    });
  },
};
