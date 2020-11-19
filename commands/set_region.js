const Player = require('../db/models/player');
const isStaffMember = require('../utils/isStaffMember');
const { regions } = require('../utils/regions');

module.exports = {
  name: 'set_region',
  usage: '@user',
  description: 'Set your region.',
  guildOnly: true,
  execute(message, args) {
    const isStaff = isStaffMember(message.member);

    let user;

    if (isStaff && args.length === 1) {
      user = message.mentions.users.first();
    } else {
      user = message.author;
    }

    Player.findOne({ discordId: user.id }).then((player) => {
      if (player.region && !isStaff) {
        return message.channel.send('You cannot change your region. Please message a staff member.');
      }

      return message.channel.send(`Please select your region. Waiting 1 minute.
\`\`\`
${regions.map((r, i) => `${i + 1} - ${r.description}`).join('\n')}
\`\`\``).then((confirmMessage) => {
        const filter = (m) => m.author.id === message.author.id;
        const options = { max: 1, time: 60000, errors: ['time'] };

        message.channel.awaitMessages(filter, options).then((collectedMessages) => {
          const collectedMessage = collectedMessages.first();
          const { content } = collectedMessage;

          confirmMessage.delete();
          collectedMessage.delete();

          const indexes = Object.keys(regions);
          indexes.forEach((i, j) => {
            indexes[j] = String(Number(indexes[j]) + 1);
          });

          if (indexes.includes(content)) {
            const region = regions[content - 1];

            Player.updateOne({ discordId: user.id }, { region: region.uid }).exec();

            if (user.id === message.author.id) {
              return message.channel.send(`Your region has been set to ${region.description}.`);
            }

            return message.channel.send(`<@!${user.id}>'s region has been set to ${region.description}.`);
          }
        });
      });
    });
  },
};
