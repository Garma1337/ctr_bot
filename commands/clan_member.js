const Discord = require('discord.js');
const Clan = require('../db/models/clans').default;
const sendMessageWithoutPing = require('../utils/sendMessageWithoutPing');
const { ROLE_MEMBER } = require('../db/models/clans');

const ADD = 'add';
const REMOVE = 'remove';

const executeAction = (message, action, clan) => {
  const { channel } = message;
  const user = message.mentions.users.first();

  message.guild.members.fetch(user).then((member) => {
    if (!member) {
      return sendMessageWithoutPing(channel, `Couldn't find the user ${member}.`);
    }

    switch (action) {
      case ADD:
        if (clan.hasMember(user.id)) {
          return sendMessageWithoutPing(channel, `${member} is already a member of the clan "${clan.shortName}".`);
        }

        clan.members.push({
          role: ROLE_MEMBER,
          discordId: user.id,
        });

        clan.save().then(() => {
          sendMessageWithoutPing(channel, `${member} was added to the clan "${clan.shortName}".`);
        });

        break;
      case REMOVE:
        if (!clan.hasMember(user.id)) {
          return sendMessageWithoutPing(channel, `${member} is not a member of the clan "${clan.shortName}".`);
        }

        clan.removeMember(user.id);
        clan.save().then(() => {
          sendMessageWithoutPing(channel, `${member} was removed from the clan "${clan.shortName}".`);
        });

        break;
    }
  });
};

module.exports = {
  name: 'clan_member',
  description(message) {
    if (message.member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES'])) {
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

    const isStaff = message.member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES']);
    const action = args[0];
    const actions = [ADD, REMOVE];

    if (actions.includes(action)) {
      const clanName = args[1];
      const mention = args[2];

      if ((!clanName || !mention) || (mention && !mention.match(Discord.MessageMentions.USERS_PATTERN))) {
        const wrongArgumentsStaff = 'Wrong arguments. Example usage: `!clan_member add CTR @user`';
        return message.channel.send(wrongArgumentsStaff);
      }

      Clan.findOne({ shortName: clanName }).then((clan) => {
        if (!clan) {
          return message.channel.send(`There is no clan with the short name "${clanName}".`);
        }

        if (!clan.hasCaptain(message.author.id) && !isStaff) {
          return message.channel.send(`You are not a captain of "${clanName}".`);
        }

        executeAction(message, action, clan);
      });
    } else {
      return message.channel.send('Invalid action.');
    }
  },
};
