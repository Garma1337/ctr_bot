const { Clan } = require('../db/models/clan');
const createPageableContent = require('../utils/createPageableContent');
const { ROLE_CAPTAIN } = require('../db/models/clan');

module.exports = {
  name: 'captains',
  description: 'List all clan captains',
  cooldown: 15,
  noHelp: true,
  guildOnly: true,
  execute(message) {
    Clan.find().then((clans) => {
      const captains = {};
      const captainMembers = [];

      clans.forEach((c) => {
        if (!captains[c.shortName]) {
          captains[c.shortName] = [];
        }

        c.members.forEach((m) => {
          if (m.role === ROLE_CAPTAIN) {
            captains[c.shortName].push(m.discordId);
            captainMembers.push(m.discordId);
          }
        });
      });

      const text = [];
      Object.keys(captains).sort().forEach((k) => {
        if (captains[k].length > 0) {
          text.push(`**${k}**: ${captains[k].map((cp) => `<@${cp}>`).join(', ')}`);
        } else {
          text.push(`**${k}**: None`);
        }
      });

      createPageableContent(message.channel, message.author.id, {
        outputType: 'embed',
        elements: text,
        elementsPerPage: 15,
        embedOptions: {
          heading: `Clan Captains (${captainMembers.length})`,
          image: 'https://i.imgur.com/EwZCCpX.png',
        },
        reactionCollectorOptions: { time: 3600000 },
      });
    });
  },
};
