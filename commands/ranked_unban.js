const RankedBan = require('../db/models/ranked_bans');
const findMember = require('../utils/findMember');

module.exports = {
  name: 'ranked_unban',
  description: 'Ranked unban',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  async execute(message, args) {
    if (args.length) {
      const argument = args.shift();
      let member = message.mentions.users.first();
      if (!member) {
        try {
          member = await findMember(message.guild, argument);
        } catch (error) {
          return message.channel.send(error.message);
        }
      }

      RankedBan.findOne({ guildId: message.guild.id, discordId: member.id }).then((doc) => {
        if (!doc) {
          return message.channel.send('Banned user not found.');
        }

        const promises = [];

        const docDeletePromise = doc.delete();
        promises.push(docDeletePromise);

        const channel = message.guild.channels.cache.find((c) => c.name === 'ranked-lobbies');
        const permissionOverwrites = channel.permissionOverwrites.get(doc.discordId);
        if (permissionOverwrites) {
          const permissionDeletePromise = permissionOverwrites.delete();
          promises.push(permissionDeletePromise);
        }
        const msg = message.channel.send('...');

        Promise.all([msg, ...promises]).then(([m]) => {
          m.edit(`${member} was unbanned from ranked lobbies.`);
        });
      });
    }
  },
};
