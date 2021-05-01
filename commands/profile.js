const moment = require('moment');
const config = require('../config');
const { Clan } = require('../db/models/clan');
const { Player } = require('../db/models/player');
const { Rank } = require('../db/models/rank');
const generateSuperScoreRanking = require('../utils/generateSuperScoreRanking');
const sendAlertMessage = require('../utils/sendAlertMessage');
const { regions } = require('../db/regions');

const {
  RACE_FFA,
  RACE_SURVIVAL,
  RACE_ITEMLESS_FFA,
  BATTLE_FFA,
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
        let rankedName;
        let favCharacter;
        let favTrack;
        let playerConsoles;
        let favArena;

        if (!player) {
          psn = '-';
          flag = '-';
          region = '-';
          languages = ['-'];
          birthday = '-';
          nat = '-';
          timeZone = '-';
          rankedName = '-';
          favCharacter = '-';
          favTrack = '-';
          playerConsoles = ['-'];
          favArena = '-';
        } else {
          psn = player.psn || '-';
          flag = player.flag || '-';
          region = getRegionName(player.region);
          languages = player.languages.length > 0 ? player.languages : ['-'];
          nat = player.nat || '-';
          timeZone = player.timeZone || '-';
          rankedName = player.rankedName || '-';
          favCharacter = player.favCharacter || '-';
          favTrack = player.favTrack || '-';
          playerConsoles = player.consoles.length > 0 ? player.consoles : ['-'];
          favArena = player.favArena || '-';

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
          `**PSN**: ${psn.replace('_', '\\_')}`,
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
          `**Ranked Name**: ${rankedName.replace('_', '\\_')}`,
          `**Consoles**: ${playerConsoles.join(', ')}`,
          `**Clans**: ${playerClans.join(', ')}`,
          `**Fav. Character**: ${favCharacter}`,
          `**Fav. Track**: ${favTrack}`,
          `**Fav. Arena**: ${favArena}`,
        ];

        embedFields.push({
          name: ':video_game: Game Data',
          value: gameData.join('\n'),
          inline: true,
        });

        embedFields.push({ name: '\u200B', value: '\u200B' });

        /* Ranks */
        Rank.findOne({ name: psn }).then((rank) => {
          generateSuperScoreRanking().then((superScoreRanking) => {
            let playerRanks;
            const superScoreEntry = superScoreRanking.find((r) => r.psn === psn);

            if (!rank) {
              playerRanks = [
                '**Items Racing**: -',
                '**Itemless Racing**: -',
                '**Battle Mode**: -',
                '**Survival**: -',
                '**Super Score**: -',
              ];
            } else {
              const itemsRanking = getRankingPosition(rank, RACE_FFA);
              const itemlessRanking = getRankingPosition(rank, RACE_ITEMLESS_FFA);
              const battleModeRanking = getRankingPosition(rank, BATTLE_FFA);
              const survivalRanking = getRankingPosition(rank, RACE_SURVIVAL);

              playerRanks = [
                `**Items Racing**: ${itemsRanking !== '-' ? `#${itemsRanking} - ${getRankingRating(rank, RACE_FFA)}` : '-'}`,
                `**Itemless Racing**: ${itemlessRanking !== '-' ? `#${itemlessRanking} - ${getRankingRating(rank, RACE_ITEMLESS_FFA)}` : '-'}`,
                `**Battle Mode**: ${battleModeRanking !== '-' ? `#${battleModeRanking} - ${getRankingRating(rank, BATTLE_FFA)}` : '-'}`,
                `**Survival**: ${survivalRanking !== '-' ? `#${survivalRanking} - ${getRankingRating(rank, RACE_SURVIVAL)}` : '-'}`,
                `**Super Score**: ${superScoreEntry ? `#${superScoreEntry.rank} - ${superScoreEntry.superScore}` : '-'}`,
              ];
            }

            embedFields.push({
              name: ':checkered_flag: Rankings',
              value: playerRanks.join('\n'),
              inline: true,
            });

            /* Achievements */
            const achievements = [];

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

            if (player
                && player.psn
                && player.flag
                && player.nat
                && player.timeZone
                && player.birthday
                && (player.discordVc || player.ps4Vc)
                && player.rankedName
                && player.favCharacter
                && player.favTrack
                && player.languages.length > 0
                && player.consoles.length > 0
                && player.favArena
            ) {
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
