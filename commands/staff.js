const config = require('../config');
const Player = require('../db/models/player');

module.exports = {
  name: 'staff',
  description: 'List staff members',
  guildOnly: true,
  aliases: ['staff_members'],
  execute(message) {
    message.guild.members.fetch().then(async (members) => {
      const admins = [];
      const developers = [];
      const tournamentStaff = [];
      const rankedStaff = [];
      const wcStaff = [];
      const crashteamrankingStaff = [];
      const mediaStaff = [];

      members.forEach((member) => {
        if (member.user.bot) {
          return;
        }

        if (member.roles.cache.find((r) => r.name.toLowerCase() === config.roles.admin_role.toLowerCase())) {
          admins.push(member.id);
        }

        if (member.roles.cache.find((r) => r.name.toLowerCase() === config.roles.bot_developer_role.toLowerCase())) {
          developers.push(member.id);
        }

        if (member.roles.cache.find((r) => r.name.toLowerCase() === config.roles.tournament_staff_role.toLowerCase())) {
          tournamentStaff.push(member.id);
        }

        if (member.roles.cache.find((r) => r.name.toLowerCase() === config.roles.ranked_staff_role.toLowerCase())) {
          rankedStaff.push(member.id);
        }

        if (member.roles.cache.find((r) => r.name.toLowerCase() === config.roles.wc_staff_role.toLowerCase())) {
          wcStaff.push(member.id);
        }

        if (member.roles.cache.find((r) => r.name.toLowerCase() === config.roles.ctr_staff_role.toLowerCase())) {
          crashteamrankingStaff.push(member.id);
        }

        if (member.roles.cache.find((r) => r.name.toLowerCase() === config.roles.media_staff_role.toLowerCase())) {
          mediaStaff.push(member.id);
        }
      });

      const all = [...admins];
      all.push(...developers);
      all.push(...tournamentStaff);
      all.push(...rankedStaff);
      all.push(...wcStaff);
      all.push(...crashteamrankingStaff);
      all.push(...mediaStaff);

      const players = await Player.find({ discordId: { $in: all } });
      const mention = (m) => {
        const player = players.find((p) => p.discordId === m);

        let flag = ':united_nations:';
        if (player && player.flag) {
          flag = player.flag;
        }

        return `${flag} <@!${m}>`;
      };

      const embed = {
        color: 16777214,
        timestamp: new Date(),
        thumbnail: {
          url: 'https://static.wikia.nocookie.net/crashban/images/a/ad/1Lcae65b.png',
        },
        author: {
          name: 'CTR Competitive Hub Staff',
          icon_url: 'https://static.wikia.nocookie.net/crashban/images/a/ad/1Lcae65b.png',
        },
        fields: [
          {
            name: config.roles.admin_role,
            value: admins.map(mention).join('\n'),
            inline: true,
          },
          {
            name: config.roles.bot_developer_role,
            value: developers.map(mention).join('\n'),
            inline: true,
          },
          {
            name: '\u200B',
            value: '\u200B',
            inline: true,
          },
          {
            name: config.roles.tournament_staff_role,
            value: tournamentStaff.map(mention).join('\n'),
            inline: true,
          },
          {
            name: config.roles.ranked_staff_role,
            value: rankedStaff.map(mention).join('\n'),
            inline: true,
          },
          {
            name: '\u200B',
            value: '\u200B',
            inline: true,
          },
          {
            name: config.roles.wc_staff_role,
            value: wcStaff.map(mention).join('\n'),
            inline: true,
          },
          {
            name: config.roles.ctr_staff_role,
            value: crashteamrankingStaff.map(mention).join('\n'),
            inline: true,
          },
          {
            name: '\u200B',
            value: '\u200B',
            inline: true,
          },
          {
            name: config.roles.media_staff_role,
            value: mediaStaff.map(mention).join('\n'),
            inline: true,
          },
        ],
      };

      message.channel.send({ embed });
    });
  },
};
