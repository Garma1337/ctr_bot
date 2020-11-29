const Player = require('../db/models/player');
const createPageableContent = require('../utils/createPageableContent');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'countries',
  description: 'Countries of members.',
  guildOnly: true,
  aliases: ['country'],
  execute(message, args) {
    message.guild.members.fetch().then((members) => {
      if (!args.length) {
        const membersIds = Array.from(members.keys());
        Player.aggregate([
          {
            $match: { flag: { $ne: null }, discordId: { $in: membersIds } },
          },
          {
            $group: {
              _id: '$flag',
              count: { $sum: 1 },
            },
          },
          {
            $sort: { count: -1 },
          },
        ]).then((counts) => {
          const elements = counts.map((c) => `${c._id} - ${c.count} players`);

          createPageableContent(message.channel, message.author.id, {
            outputType: 'embed',
            elements,
            elementsPerPage: 20,
            embedOptions: { heading: 'Countries' },
            reactionCollectorOptions: { time: 3600000 },
          });
        });
      } else {
        const flag = args.shift();

        if (!message.client.flags.includes(flag)) {
          return sendAlertMessage(message.channel, 'You should specify country flag. To see them all use the `!flags` command', 'warning');
        }

        Player.find({ flag }).then(async (players) => {
          if (players.length <= 0) {
            return sendAlertMessage(message.channel, `There are no players from ${flag}.`, 'info');
          }

          players = players.filter((p) => members.has(p.discordId)).map((p) => `<@${p.discordId}>`);

          createPageableContent(message.channel, message.author.id, {
            outputType: 'text',
            elements: players,
            elementsPerPage: 20,
            textOptions: { heading: `Players from ${flag} (${players.length})` },
            reactionCollectorOptions: { time: 3600000 },
          });
        });
      }
    });
  },
};
