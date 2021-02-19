const moment = require('moment');
const config = require('../config');
const { Clan } = require('../db/models/clan');
const { Player } = require('../db/models/player');
const { Rank } = require('../db/models/rank');
const calculateSuperScore = require('../utils/calculateSuperScore');
const getConfigValue = require('../utils/getConfigValue');
const sendAlertMessage = require('../utils/sendAlertMessage');
const { regions } = require('../db/regions');

const {
  RACE_FFA,
  RACE_DUOS,
  RACE_3V3,
  RACE_4V4,
  RACE_SURVIVAL,
  RACE_ITEMLESS_FFA,
  BATTLE_FFA,
  BATTLE_4V4,
} = require('../db/models/lobby');

/**
 * Gets the ranking position for a given mode
 * @param rank
 * @param mode
 * @returns {number | string}
 */
function getRankingPosition(rank, mode) {
  mode = mode.toLowerCase();
  let position;

  if (!rank[mode]) {
    position = '-';
  } else {
    position = rank[mode].position + 1;

    if (Number.isNaN(position)) {
      position = '-';
    }
  }

  return position;
}

/**
 * Gets the ranking rating for a given mode
 * @param rank
 * @param mode
 * @returns {number | string}
 */
function getRankingRating(rank, mode) {
  mode = mode.toLowerCase();
  let rating;

  if (!rank[mode]) {
    rating = '-';
  } else {
    rating = parseInt(rank[mode].rank, 10);

    if (Number.isNaN(rating)) {
      rating = '-';
    }
  }

  return rating;
}

/**
 * Gets a region name by uid
 * @param regionUid
 * @return String
 */
function getRegionName(regionUid) {
  const region = regions.find((r) => r.uid === regionUid);

  if (region) {
    return region.name;
  }

  return '-';
}

/**
 * Returns the profile embed
 * @param guildMember
 * @param fields
 * @param url
 * @return Object
 */
function getEmbed(guildMember, fields, url) {
  let avatarUrl;
  if (guildMember.user.avatar) {
    avatarUrl = `https://cdn.discordapp.com/avatars/${guildMember.user.id}/${guildMember.user.avatar}.png`;
  } else {
    avatarUrl = guildMember.user.defaultAvatarURL;
  }

  const embed = {
    color: guildMember.displayColor,
    timestamp: new Date(),
    thumbnail: {
      url: avatarUrl,
    },
    footer: {
      text: `!profile help  •  id: ${guildMember.user.id}`,
    },
    author: {
      name: `${guildMember.user.username}#${guildMember.user.discriminator}'s profile${guildMember.user.bot ? ' (Bot)' : ''}`,
      icon_url: avatarUrl,
    },
    fields,
  };

  if (url !== null) {
    embed.author.url = url;
  }

  return embed;
}

module.exports = {
  name: 'profile',
  usage: '@user',
  description: 'Check a player profile.',
  guildOnly: true,
  aliases: ['p'],
  cooldown: 10,
  execute(message, args) {
    let user = message.author;

    if (args.length > 0) {
      user = message.mentions.users.first();

      if (!user) {
        return sendAlertMessage(message.channel, 'You need to mention a user.', 'warning');
      }
    }

    const guildMember = message.guild.member(user);
    const embedFields = [];

    Player.findOne({ discordId: user.id }).then((player) => {
      Clan.find().then((clans) => {
        /* Profile */
        let psn;
        let flag;
        let region;
        let languages;
        let birthday;
        let voiceChat = [];
        let nat;
        let timeZone;
        let favCharacter;
        let favTrack;
        let playerConsoles;

        if (!player) {
          psn = '-';
          flag = '-';
          region = '-';
          languages = ['-'];
          birthday = '-';
          nat = '-';
          timeZone = '-';
          favCharacter = '-';
          favTrack = '-';
          playerConsoles = ['-'];
        } else {
          psn = player.psn || '-';
          flag = player.flag || '-';
          region = getRegionName(player.region);
          languages = player.languages.length > 0 ? player.languages : ['-'];
          nat = player.nat || '-';
          timeZone = player.timeZone || '-';
          favCharacter = player.favCharacter || '-';
          favTrack = player.favTrack || '-';
          playerConsoles = player.consoles.length > 0 ? player.consoles : ['-'];

          if (!player.birthday) {
            birthday = '-';
          } else {
            const birthDate = new Date(player.birthday);
            birthday = `${birthDate.toLocaleString('default', { month: 'short' })} ${birthDate.getDate()}, ${birthDate.getFullYear()}`;
          }

          if (player.discordVc) {
            voiceChat.push('Discord');
          }

          if (player.ps4Vc) {
            voiceChat.push('PS4');
          }
        }

        if (languages.length < 1) {
          languages.push('-');
        }

        if (voiceChat.length < 1) {
          voiceChat = ['-'];
        }

        const profile = [
          `**PSN**: ${psn.replace(/_/g, '\\_')}`,
          `**Country**: ${flag}`,
          `**Region**: ${region}`,
          `**Languages**: ${languages.join(', ')}`,
          `**Birthday**: ${birthday}`,
          `**Voice Chat**: ${voiceChat.join(', ')}`,
          `**NAT Type**: ${nat}`,
          `**Time Zone**: ${timeZone}`,
          `**Joined**: ${guildMember.joinedAt.toLocaleString('default', { month: 'short' })} ${guildMember.joinedAt.getDate()}, ${guildMember.joinedAt.getFullYear()}`,
          `**Registered**: ${guildMember.user.createdAt.toLocaleString('default', { month: 'short' })} ${guildMember.user.createdAt.getDate()}, ${guildMember.user.createdAt.getFullYear()}`,
        ];

        // eslint-disable-next-line max-len
        if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === config.roles.ranked_verified_role.toLowerCase())) {
          profile.push('**Ranked Verified** :white_check_mark:');
        }

        if (guildMember.user.bot) {
          profile.push('**Discord Bot** :robot:');
        }

        embedFields.push({
          name: ':busts_in_silhouette: Profile',
          value: profile.join('\n'),
          inline: true,
        });

        /* Game Data */
        let playerClans = [];

        clans.forEach((c) => {
          if (c.hasMember(user.id)) {
            playerClans.push(c.shortName);
          }
        });

        if (playerClans.length < 1) {
          playerClans = ['-'];
        }

        const gameData = [
          `**Consoles**: ${playerConsoles.join(', ')}`,
          `**Clans**: ${playerClans.join(', ')}`,
          `**Fav. Character**: ${favCharacter}`,
          `**Fav. Track**: ${favTrack}`,
        ];

        embedFields.push({
          name: ':video_game: Game Data',
          value: gameData.join('\n'),
          inline: true,
        });

        embedFields.push({ name: '\u200B', value: '\u200B' });

        /* Ranks */
        Rank.findOne({ name: psn }).then((rank) => {
          const promise = getConfigValue('super_score_base_rank');
          Promise.resolve(promise).then((baseRank) => {
            let playerRanks;

            if (!rank) {
              playerRanks = [
                '**Items FFA**: -',
                '**Duos**: -',
                '**3 vs. 3**: -',
                '**4 vs. 4**: -',
                '**Survival**: -',
                '**Itemless FFA**: -',
                '**Battle FFA**: -',
                '**Battle 4 vs. 4**: -',
                '**Super Score**: -',
              ];
            } else {
              const itemsRanking = getRankingPosition(rank, RACE_FFA);
              const duosRanking = getRankingPosition(rank, RACE_DUOS);
              const _3v3Ranking = getRankingPosition(rank, RACE_3V3);
              const _4v4Ranking = getRankingPosition(rank, RACE_4V4);
              const survivalRanking = getRankingPosition(rank, RACE_SURVIVAL);
              const itemlessRanking = getRankingPosition(rank, RACE_ITEMLESS_FFA);
              const battleFFARanking = getRankingPosition(rank, BATTLE_FFA);
              const battle4v4Ranking = getRankingPosition(rank, BATTLE_4V4);

              playerRanks = [
                `**Items FFA**: ${itemsRanking !== '-' ? `#${itemsRanking} - ${getRankingRating(rank, RACE_FFA)}` : '-'}`,
                `**Duos**: ${duosRanking !== '-' ? `#${duosRanking} - ${getRankingRating(rank, RACE_DUOS)}` : '-'}`,
                `**3 vs. 3**: ${_3v3Ranking !== '-' ? `#${_3v3Ranking} - ${getRankingRating(rank, RACE_3V3)}` : '-'}`,
                `**4 vs. 4**: ${_4v4Ranking !== '-' ? `#${_4v4Ranking} - ${getRankingRating(rank, RACE_4V4)}` : '-'}`,
                `**Survival**: ${survivalRanking !== '-' ? `#${survivalRanking} - ${getRankingRating(rank, RACE_SURVIVAL)}` : '-'}`,
                `**Itemless FFA**: ${itemlessRanking !== '-' ? `#${itemlessRanking} - ${getRankingRating(rank, RACE_ITEMLESS_FFA)}` : '-'}`,
                `**Battle FFA**: ${battleFFARanking !== '-' ? `#${battleFFARanking} - ${getRankingRating(rank, BATTLE_FFA)}` : '-'}`,
                `**Battle 4 vs. 4**: ${battle4v4Ranking !== '-' ? `#${battle4v4Ranking} - ${getRankingRating(rank, BATTLE_4V4)}` : '-'}`,
                `**Super Score**: ${calculateSuperScore(rank, baseRank)}`,
              ];
            }

            embedFields.push({
              name: ':checkered_flag: Rankings',
              value: playerRanks.join('\n'),
              inline: true,
            });

            /* Achievements */
            const achievements = [];

            if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === config.roles.admin_role.toLowerCase()) || guildMember.hasPermission(['ADMINISTRATOR'])) {
              achievements.push('Administrator');
            }

            // eslint-disable-next-line max-len
            if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === config.roles.staff_role.toLowerCase())) {
              achievements.push('Staff Member');
            }

            // eslint-disable-next-line max-len
            if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === config.roles.bot_developer_role.toLowerCase())) {
              achievements.push('Bot Developer');
            }

            // eslint-disable-next-line max-len
            if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === config.roles.media_staff_role.toLowerCase())) {
              achievements.push('Media Staff');
            }

            // eslint-disable-next-line max-len
            if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === config.roles.ctr_staff_role.toLowerCase())) {
              achievements.push('CrashTeamRanking Staff');
            }

            // eslint-disable-next-line max-len
            if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === config.roles.donator_role.toLowerCase())) {
              achievements.push('Donator');
            }

            // eslint-disable-next-line max-len
            if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === config.roles.wc_champion_role.toLowerCase())) {
              achievements.push('World Cup Champion');
            }

            // eslint-disable-next-line max-len
            if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === config.roles.tournament_champion_role.toLowerCase())) {
              achievements.push('Tournament Champion');
            }

            // eslint-disable-next-line max-len
            if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === config.roles.ranked_champion_role.toLowerCase())) {
              achievements.push('Ranked Champion');
            }

            // eslint-disable-next-line max-len
            if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === config.roles.challenge_master_role.toLowerCase())) {
              achievements.push('Challenge Master');
            }

            // eslint-disable-next-line max-len
            if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === config.roles.captain_role.toLowerCase())) {
              achievements.push('Captain');
            }

            // eslint-disable-next-line max-len
            if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === config.roles.nitro_booster_role.toLowerCase())) {
              achievements.push('Server Booster');
            }

            if (user.id === '462335970126200832') {
              achievements.push('Shot in the Head by <@!588477134197096485>');
            }

            const currentDate = moment(new Date());
            const joinDate = moment(guildMember.joinedAt);

            if (currentDate.diff(joinDate, 'years', true) > 1) {
              achievements.push('Member for over 1 year');
            }

            // eslint-disable-next-line max-len
            if (player && player.psn && player.flag && player.nat && player.timeZone && player.birthday && (player.discordVc || player.ps4Vc) && player.favCharacter && player.favCharacter && player.languages.length > 0 && player.consoles.length > 0) {
              achievements.push('Complete Profile');
            }

            const achievementCount = achievements.length;
            if (achievementCount < 1) {
              achievements.push('None');
            }

            embedFields.push({
              name: `:trophy: Achievements (${achievementCount})`,
              value: achievements.join('\n'),
              inline: true,
            });

            let url = null;
            if (player && player.psn) {
              url = `https://my.playstation.com/profile/${player.psn}`;
            }

            const embed = getEmbed(guildMember, embedFields, url);
            return message.channel.send({ embed });
          });
        });
      });
    });

    return true;
  },
};
