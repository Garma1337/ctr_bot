const { Clan } = require('../db/models/clan');
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');
const { MEMBER_ROLES } = require('../db/models/clan');

module.exports = {
  name: 'clan_role',
  usage: '[member] [clan] [role]',
  description: 'Modify the role of a clan member. Example: `!clan_role @Garma GSC captain`.',
  guildOnly: true,
  aliases: ['cr'],
  execute(message, args) {
    if (args.length < 3) {
      return sendAlertMessage(message.channel, 'Wrong command usage. Example: `!clan_role @Garma GSC captain`.', 'warning');
    }

    const user = message.mentions.users.first();

    if (!user) {
      return sendAlertMessage(message.channel, 'You need to mention a user.', 'warning');
    }

    const clanName = args[1];
    const role = args[2].toLowerCase();

    Clan.find().then((clans) => {
      const clan = clans.find((c) => c.shortName.toLowerCase() === clanName.toLowerCase());
      if (!clan) {
        return sendAlertMessage(message.channel, `The clan "${clanName}" does not exist.`, 'warning');
      }

      const isStaff = isStaffMember(message.member);

      if (!clan.hasCaptain(message.author.id) && !isStaff) {
        return sendAlertMessage(message.channel, `You are not a captain of "${clan}".`, 'warning');
      }

      if (!clan.hasMember(user.id)) {
        return sendAlertMessage(message.channel, `<@!${user.id}> is not a member of "${clanName}".`, 'warning');
      }

      if (!MEMBER_ROLES.includes(role)) {
        return sendAlertMessage(message.channel, `Invalid role "${role}". Available roles are ${MEMBER_ROLES.join(', ')}.`, 'warning');
      }

      clan.setMemberRole(user.id, role);
      clan.save().then(() => sendAlertMessage(message.channel, `Member role has been switched to ${role}.`, 'success'));
    });
  },
};
