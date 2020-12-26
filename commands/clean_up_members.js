const Clan = require('../db/models/clans').default;
const Player = require('../db/models/player');
const Rank = require('../db/models/rank');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'clean_up_members',
  description: 'Removes players who left the server from the database',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message) {
    const out = [];

    Player.find().then((players) => {
      players.forEach((p) => {
        message.guild.members.fetch().then((members) => {
          const member = members.find((m) => m.user.id === p.discordId);

          if (!member) {
            Clan.find({ 'members.discordId': p.discordId }).then((clans) => {
              clans.forEach((c) => {
                c.removeMember(p.discordId);
                c.save().then(() => {
                  out.push(`Removed player ${p.discordId} from clan "${c.shortName}".`);
                });
              });
            });

            if (p.psn) {
              Rank.findOne({ name: p.psn }).then((rank) => {
                if (rank) {
                  rank.delete().then(() => {
                    out.push(`Removed rank for player ${rank.name}.`);
                  });
                }
              });
            }

            p.delete().then(() => {
              out.push(`Removed player ${p.discordId}.`);
            });
          }

          sendAlertMessage(message.channel, out, 'success');
        });
      });
    });
  },
};
