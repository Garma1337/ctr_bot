const moment = require('moment');
const RankedLobby = require('../db/models/ranked_lobbies').default;
const RankedBan = require('../db/models/ranked_bans');
const findMember = require('../utils/findMember');
const sendLogMessage = require('../utils/sendLogMessage');

module.exports = {
  name: 'ranked_bans',
  description: 'Ranked bans',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  aliases: ['ranked_ban'],
  async execute(message, args) {
    if (args.length) {
      const argument = args[0];
      let member = message.mentions.users.first();
      if (!member) {
        try {
          member = await findMember(message.guild, argument);
        } catch (error) {
          return message.channel.send(error.message);
        }
      }

      let duration;
      let reason;
      if (args.length > 1) {
        const arg = args.slice(1).join(' ');
        const match = arg.match(/(\d+)\s?(\w+)/);
        if (match) {
          const inp = match[1];
          const unit = match[2];
          duration = moment.duration(inp, unit);
        }

        if (args.length > 2) {
          reason = args.slice(2).join(' ');
        }
      }

      RankedBan.findOne({ discordId: member.id, guildId: message.guild.id }).then((doc) => {
        if (doc) {
          return message.channel.send('This member is already banned.');
        }

        const rb = new RankedBan();
        rb.guildId = message.guild.id;
        rb.discordId = member.id;
        rb.bannedAt = new Date();
        rb.bannedBy = message.author.id;
        rb.reason = reason;

        if (duration) {
          rb.bannedTill = moment().add(duration);
        }

        const savePromise = rb.save();

        const lobbiesChannel = message.guild.channels.cache.find((c) => c.name === 'ranked-lobbies');
        const overwritePromise = lobbiesChannel.createOverwrite(member, { VIEW_CHANNEL: false });

        const msg = message.channel.send('...');

        RankedLobby.find({ guild: message.guild.id, players: member.id, started: false }).then((docs) => {
          docs.forEach(async (doc) => {
            const guild = message.client.guilds.cache.get(doc.guild);
            if (guild) {
              const channel = guild.channels.cache.get(doc.channel);
              if (channel) {
                channel.messages.fetch(doc.message).then((msg) => {
                  if (doc.type === 'duos') {
                    const duo = doc.teamList.filter((d) => d.includes(member.id));
                    duo.forEach((d) => {
                      d.forEach((p) => {
                        msg.reactions.cache.get('✅').users.remove(p);
                      });
                    });
                  } else {
                    msg.reactions.cache.get('✅').users.remove(member.id);
                  }
                });
              }
            }
          });
        });

        Promise.all([msg, savePromise, overwritePromise]).then(([m]) => {
          let output = `${member} was banned from ranked lobbies`;
          if (duration) {
            output += ` for ${duration.humanize()}`;
          }
          output += '.';

          if (reason) {
            output += ` Reason: ${reason}.`;
          }

          m.edit(output);
        });

        member.createDM().then((channel) => {
          let out = `Hello ${member}, you have been banned from participating in ranked lobbies`;

          if (duration) {
            out += ` for ${duration.humanize()}`;
          }

          if (reason) {
            out += ` for the following reason: ${reason}.`;
          } else {
            out += '.';
          }

          out += '\n\nIf you feel like you have been unfairly banned, please contact a staff member.';

          channel.send(out);

          const logMessage = `Sent message to ${channel.recipient}:\n\`\`\`${out}\`\`\``;
          sendLogMessage(message.guild, logMessage);
        }).catch(() => {
          message.channel.send(`Could not send a DM to ${member}. Make sure to let them know of their ban.`);
        });
      });
    } else {
      message.channel.send('...').then((m) => {
        RankedBan.find({ guildId: message.guild.id }).then(async (docs) => {
          if (!docs.length) {
            return m.edit('There are no bans ... yet.');
          }

          const bannedMembers = [];

          message.guild.members.fetch().then((members) => {
            docs.forEach((doc) => {
              let member = members.get(doc.discordId);
              if (!member) {
                member = `<@${doc.discordId}> [user left the server]`;
              }

              let till = 'forever';
              if (doc.bannedTill) {
                // noinspection JSCheckFunctionSignatures
                till = moment(doc.bannedTill).utc().format('YYYY-MM-DD HH:mm:ss z');
              }

              let out;
              if (till !== 'forever') {
                out = `${member}: Banned until ${till}.`;
              } else {
                out = `${member}: Banned forever.`;
              }

              if (doc.reason) {
                out += ` Reason: ${doc.reason}.`;
              }

              bannedMembers.push(out);
            });
            m.edit(bannedMembers);
          });
        });
      });
    }
  },
};
