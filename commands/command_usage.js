const moment = require('moment');
const config = require('../config');
const CommandUsage = require('../db/models/command_usage');
const createPageableContent = require('../utils/createPageableContent');

module.exports = {
  name: 'command_usage',
  description: 'Show command usage',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message) {
    const aggregatorOpts = [
      {
        $group: {
          _id: '$name',
          usages: { $sum: 1 },
          last: { $max: '$date' },
        },
      },
    ];

    CommandUsage.aggregate(aggregatorOpts).then((commands) => {
      const sort = (a, b) => b.usages - a.usages;
      const format = (c, i) => `**${i + 1}**. \`${config.prefix}${c._id}\`\n**Usage**: ${c.usages} times\n**Last used**: ${moment(c.last).fromNow()}\n`;

      createPageableContent(message.channel, message.author.id, {
        outputType: 'embed',
        elements: commands.sort(sort).map(format),
        elementsPerPage: 5,
        embedOptions: {
          heading: 'Most used commands',
        },
        reactionCollectorOptions: { time: 3600000 },
      });
    });
  },
};
