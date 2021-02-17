const { Player } = require('../db/models/player');
const { consoles } = require('../db/consoles');
const { regions } = require('../db/regions');
const { serverLanguages } = require('../db/serverLanguages');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'export_members',
  description: 'Export the member database as CSV',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  aliases: ['export_players', 'members', 'players'],
  execute(message) {
    const head = [
      'Discord ID',
      'Discord Username',
      'PSN ID',
      'Country Flag',
      'Region',
      'Languages',
      'Birthday',
      'Discord VC?',
      'PS4 VC?',
      'NAT Type',
      'Time Zone',
      'Favorite Character',
      'Favorite Track',
      'Consoles',
    ];

    const headRow = `${head.join(';')}\n`;

    const discordIds = message.guild.members.cache.map((m) => m.id);

    Player.find({ discordId: { $in: discordIds } }).then((players) => {
      // eslint-disable-next-line array-callback-return,consistent-return
      const out = players.map((p) => {
        const member = message.guild.members.cache.find((m) => m.id === p.discordId);
        if (member) {
          let regionName;
          if (p.region) {
            const region = regions.find((r) => r.uid === p.region);
            if (region) {
              regionName = region.name;
            }
          }

          const languages = [];
          if (p.languages.length > 0) {
            p.languages.forEach((l) => {
              const language = serverLanguages.find((sl) => sl.emote === l);

              if (language) {
                languages.push(language.char);
              }
            });
          }

          const playerConsoles = [];
          if (p.consoles.length > 0) {
            p.consoles.forEach((pc) => {
              const console = consoles.find((c) => c.tag === pc);

              if (console) {
                playerConsoles.push(console.name);
              }
            });
          }

          const row = [
            p.discordId,
            member.user.tag,
            p.psn,
            p.flag,
            regionName,
            languages.join(', '),
            p.birthday,
            p.discordVc,
            p.ps4Vc,
            p.nat,
            p.timeZone,
            p.favCharacter,
            p.favTrack,
            playerConsoles.join(', '),
          ];

          return row.join(';');
        }
      });

      const txt = headRow + out.join('\n');

      message.channel.send({
        files: [{
          attachment: Buffer.from(txt, 'utf-8'),
          name: 'members.csv',
        }],
      }).then(() => {
        sendAlertMessage(message.channel, `Exported ${out.length} players.`, 'success');
      });
    });
  },
};
