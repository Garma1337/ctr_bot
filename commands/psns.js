const Player = require('../db/models/player');

module.exports = {
  name: 'psns',
  description: 'Get the list of all members',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message) {
    const head = ['id', 'username#tag', 'PSN', 'flag'];
    const headRow = `${head.join(',')}\n`;

    message.guild.members.fetch().then((members) => {
      Player.find().then((players) => {
        const out = players.map((p) => {
          const member = members.get(p.discordId);
          let userTag = '';
          if (member) {
            userTag = `${member.user.username}#${member.user.discriminator}`;
          }
          return [p.discordId, userTag, p.psn, p.flag].join(',');
        });

        const txt = headRow + out.join('\n');
        message.reply({
          files: [{
            attachment: Buffer.from(txt, 'utf-8'),
            name: 'psns.csv',
          }],
        });
      });
    });
  },
};
