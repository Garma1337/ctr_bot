const Clan = require('../db/models/clans').default;
const { ROLE_CAPTAIN, ROLE_MEMBER } = require('../db/models/clans');

module.exports = {
  name: 'move_clan_players_to_database',
  description: 'Move all clan players to the database.',
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  guildOnly: true,
  execute(message, args) {
    let removeRoles = false;
    if (args.length > 0) {
      removeRoles = (args[0] === 'remove_roles');
    }

    Clan.find().then((clans) => {
      message.guild.members.cache.forEach((m) => {
        const captainRole = m.roles.cache.find((r) => r.name.toLowerCase() === 'captain');
        let role = ROLE_MEMBER;
        if (captainRole) {
          role = ROLE_CAPTAIN;
        }

        clans.forEach((c, i) => {
          const clanRole = m.roles.cache.find((r) => r.name.toLowerCase() === c.fullName.toLowerCase());

          if (clanRole) {
            if (!clans[i].hasMember(m.user.id)) {
              clans[i].members.push({
                role,
                discordId: m.user.id,
              });
            }

            if (removeRoles) {
              m.roles.remove(clanRole).then(() => {});
            }
          }
        });
      });

      clans.forEach((c) => {
        c.save().then(() => {
          message.channel.send(`Updated clan "${c.shortName}" ...`);
        });
      });
    });
  },
};
