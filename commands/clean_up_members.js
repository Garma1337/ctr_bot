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
    Player.find().then((players) => {
      players.forEach((p) => {
        message.guild.members.fetch().then((members) => {
          const member = members.find((m) => m.user.id === p.discordId);

          if (!member) {
            Clan.find({ 'members.discordId': p.discordId }).then((clans) => {
              clans.forEach((c) => {
                c.removeMember(p.discordId);
                c.save();
              });
            });

            if (p.psn) {
              Rank.findOne({ name: p.psn }).then((rank) => {
                if (rank) {
                  rank.delete();
                }
              });
            }

            p.delete();
          }
        });
      });
    });

    sendAlertMessage(message.channel, 'Done.', 'success');
  },
};
