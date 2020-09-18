const Moment = require('moment');
const Player = require('../db/models/player');
const PrivateLobby = require('../db/models/private_lobbies');
const deletePrivateLobbyByUser = require('../utils/deletePrivateLobbyByUser');

/**
 * Returns the embed for the private lobby
 * @param info
 * @param players
 * @param psns
 * @param description
 * @param created
 * @returns {{footer: {icon_url: string, text: string}, author: {icon_url: string, name: string}, description: *, fields: [{inline: boolean, name: string, value: *}, {inline: boolean, name: string, value: string}]}}
 */
function getEmbed(info, players, psns, description, created) {
  const icon = 'https://vignette.wikia.nocookie.net/crashban/images/e/eb/CTRNF-%3F_Crate_Iron_Checkpoint_Crate_icon.png';

  if (players.length <= 0) {
    players = ['No players yet'];
  }

  if (psns.length <= 0) {
    psns = ['No players yet'];
  }

  return {
    author: {
      name: 'A private lobby is gathering!',
      icon_url: icon,
    },
    description,
    fields: [
      {
        name: 'Info',
        value: info.join('\n'),
        inline: true,
      },
      {
        name: 'Players',
        value: players.join('\n'),
        inline: true,
      },
      {
        name: 'PSNs',
        value: psns.join('\n'),
        inline: true,
      },
    ],
    footer: {
      text: `Created at ${created}`,
      icon_url: icon,
    },
  };
}

/**
 * Updates a private lobby with the given players
 * @param privateLobby
 * @param players
 * @param psns
 * @param userId
 */
function updatePrivateLobby(privateLobby, players, psns, userId) {
  privateLobby.updateOne({ creator: userId }, { players, psns }).exec();
}

/**
 * Removes the "message pinned" message
 * @param channel
 */
function removePinMessages(channel) {
  channel.messages.fetch().then((messages) => {
    messages.forEach((m) => {
      if (m.type === 'PINS_ADD') {
        m.delete();
      }
    });
  });
}

module.exports = {
  name: 'private_lobby',
  description: 'Create a new private lobby. Usage: `!private_lobby [mode] [players]',
  guildOnly: true,
  aliases: ['pl'],
  execute(message, args) {
    const allowedChannels = [
      message.channel.guild.channels.cache.find((c) => c.name.toLowerCase() === 'war-search'),
      message.channel.guild.channels.cache.find((c) => c.name.toLowerCase() === 'private-lobby-chat'),
    ];

    const postChannel = message.channel.guild.channels.cache.find((c) => c.name.toLowerCase() === 'private-lobbies');

    if (!allowedChannels.find((c) => c && c.name === message.channel.name)) {
      return message.channel.send(`This command can only be used in the following channels:
${allowedChannels.join('\n')}`);
    }

    const modes = [
      'FFA',
      'Itemless',
      '2vs2',
      '3vs3',
      '4vs4',
      'Battle',
    ];

    let mode = args[0] || 'FFA';

    if (mode === 'help') {
      return message.channel.send(`\`\`\`This command lets you create private lobbies similar to ranked lobbies. The usage is: !private_lobby [mode] [players].

[mode] can be any of:
 - ${modes.join('\n - ')}

[players] is the maximum amount of players that can join the lobby.

Example usage: !private_lobby FFA 8.\`\`\``);
    }

    if (mode === 'end') {
      const privateLobbyPromise = PrivateLobby.findOne({ creator: message.member.user.id });

      privateLobbyPromise.then((privateLobby) => {
        if (!privateLobby) {
          return message.channel.send('You have not started a private lobby.');
        }

        deletePrivateLobbyByUser(postChannel, message.member.user.id);
        removePinMessages(postChannel);

        message.channel.send('Your private lobby was removed.');
      });
    } else {
      PrivateLobby.findOne({ creator: message.member.user.id }).then((privateLobby) => {
        if (privateLobby) {
          return message.channel.send('You have already created a private lobby. Please remove the old one if you want to create another one.');
        }

        if (!modes.find((t) => (t.toLowerCase() === mode.toLowerCase()))) {
          return message.channel.send('Invalid mode.');
        }

        mode = mode.charAt(0).toUpperCase() + mode.slice(1);

        const defaultDescription = 'React with ✅ to participate!';
        const closedDescription = 'The lobby is now closed!';

        const author = `<@${message.member.user.id}>`;
        const maxPlayers = args[1] || 8;
        const created = Moment().format('hh:mm:ss a');
        const players = [];
        const psns = [];

        const info = [
          `Creator: **${author}**`,
          `Mode: **${mode}**`,
          `Players: **${maxPlayers}**`,
        ];

        let embed = getEmbed(info, players, psns, defaultDescription, created);

        postChannel.send({ embed }).then((m) => {
          m.react('✅');
          m.pin();

          privateLobby = new PrivateLobby({
            guild: m.guild.id,
            channel: message.channel.id,
            message: m.id,
            creator: message.member.user.id,
            mode,
            maxPlayers,
            players,
            date: created,
          });

          privateLobby.save();

          const filter = (r, u) => (['✅'].includes(r.emoji.name) && u.id !== m.author.id);
          const options = {
            max: maxPlayers + 1,
            time: 3600000,
            errors: ['time'],
            dispose: true,
          };

          const collector = m.createReactionCollector(filter, options);
          collector.on('collect', (reaction, user) => {
            if (user.id !== m.author.id && players.length < maxPlayers) {
              players.push(`<@${user.id}>`);

              Player.findOne({ discordId: user.id }).then((p) => {
                if (!p.psn) {
                  psns.push('---');
                } else {
                  psns.push(p.psn);
                }

                if (players.length >= maxPlayers) {
                  embed = getEmbed(info, players, psns, closedDescription, created);
                } else {
                  embed = getEmbed(info, players, psns, defaultDescription, created);
                }

                m.edit({ embed });
                updatePrivateLobby(privateLobby, players, psns, message.member.user.id);
              });
            }
          });

          collector.on('remove', ((reaction, user) => {
            players.forEach((v, i) => {
              if (v === `<@${user.id}>`) {
                players.splice(i, 1);
                psns.splice(i, 1);
              }
            });

            embed = getEmbed(info, players, psns, defaultDescription, created);
            m.edit({ embed });
            updatePrivateLobby(privateLobby, players, psns, message.member.user.id);
          }));

          collector.on('end', () => {
            deletePrivateLobbyByUser(message.channel, message.member.user.id);
          });
        });

        message.channel.send('Your private lobby was created.');
      });
    }
  },
};
