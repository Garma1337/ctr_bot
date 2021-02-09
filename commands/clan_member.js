const Discord = require('discord.js');
const Clan = require('../db/models/clans').default;
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');
const { ROLE_MEMBER } = require('../db/models/clans');

const ADD = 'add';
const REMOVE = 'remove';

const executeAction = (message, action, clan) => {
  const { channel } = message;
  const user = message.mentions.users.first();

  if (!user) {
    return sendAlertMessage(message.channel, 'Invalid user.', 'error');
  }

  message.guild.members.fetch(user).then((member) => {
    if (!member) {
      return sendAlertMessage(channel, `Couldn't find the user ${member}.`, 'warning');
    }

    switch (action) {
      case ADD:
        if (clan.hasMember(user.id)) {
          return sendAlertMessage(channel, `${member} is already a member of the clan "${clan.shortName}".`, 'warning');
        }

        clan.members.push({
          role: ROLE_MEMBER,
          discordId: user.id,
        });

        clan.save().then(() => {
          sendAlertMessage(channel, `${member} was added to the clan "${clan.shortName}".`, 'success');
        });

        break;
      case REMOVE:
        if (!clan.hasMember(user.id)) {
          return sendAlertMessage(channel, `${member} is not a member of the clan "${clan.shortName}".`, 'warning');
        }

        clan.removeMember(user.id);
        clan.save().then(() => {
          sendAlertMessage(channel, `${member} was removed from the clan "${clan.shortName}".`, 'success');
        });

        break;
    }
  });
};

module.exports = {
  name: 'clan_member',
  description(message) {
    if (isStaffMember(message.member)) {
      return `Edit clan members.
\`!clan_member add CTR @user
!clan_member remove CTR @user\``;
    }

    return `Edit clan members (Accessible for @Captain only).
\`!clan_member add @user
!clan_member remove @user\``;
  },
  guildOnly: true,
  execute(message, args) {
    //  !clan_member add [CTR] @tag
    //  !clan_member remove [CTR] @tag

    const isStaff = isStaffMember(message.member);
    const action = args[0];
    const actions = [ADD, REMOVE];

    if (actions.includes(action)) {
      const clanName = args[1];
      const mention = args[2];

      if ((!clanName || !mention) || (mention && !mention.match(Discord.MessageMentions.USERS_PATTERN))) {
        const wrongArgumentsStaff = 'Wrong arguments. Example usage: `!clan_member add CTR @user`';
        return sendAlertMessage(message.channel, wrongArgumentsStaff, 'warning');
      }

      Clan.findOne({ shortName: clanName }).then((clan) => {
        if (!clan) {
          return sendAlertMessage(message.channel, `There is no clan with the short name "${clanName}".`, 'warning');
        }

        if (!clan.hasCaptain(message.author.id) && !isStaff) {
          return sendAlertMessage(message.channel, `You are not a captain of "${clanName}".`, 'warning');
        }

        executeAction(message, action, clan);
      });
    } else {
      return sendAlertMessage(message.channel, `The action "${action}" does not exist.`, 'warning');
    }
  },
};
