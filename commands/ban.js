const moment = require('moment');
const { CronJob } = require('cron');
const Ban = require('../db/models/bans');
const findMember = require('../utils/findMember');
const sendLogMessage = require('../utils/sendLogMessage');
const { client } = require('../bot');

module.exports = {
  name: 'ban',
  description: '🔨',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  aliases: ['ranked_ban'],
  args: true,
  usage: '@tag [duration] [reason]',
  async execute(message, args) {
    const argument = args[0];
    let user = message.mentions.users.first(); // todo fetch users that left the server
    const { guild } = message;
    if (!user) {
      try {
        user = await findMember(guild, argument);
      } catch (error) {
        return message.channel.send(error.message);
      }
    }

    let duration;
    const match = args[1].match(/(\d+)(\w+)/);
    if (match) {
      const inp = match[1];
      const unit = match[2];
      duration = moment.duration(inp, unit);
    }

    const reason = args[2];

    Ban.findOne({ discordId: user.id, guildId: guild.id }).then(async (doc) => {
      if (doc) {
        return message.channel.send('This member is already banned.');
      }
      guild.members.ban(user.id, { reason }).then(() => {
        const rb = new Ban();
        rb.guildId = guild.id;
        rb.discordId = user.id;
        rb.bannedAt = new Date();
        rb.bannedBy = message.author.id;

        if (duration) {
          rb.bannedTill = moment().add(duration);
        }

        const savePromise = rb.save();

        const msg = message.channel.send('...');

        Promise.all([msg, savePromise]).then(([m]) => {
          let output = `${user} was banned`;
          if (duration) {
            output += ` for ${duration.humanize()}`;
          }
          output += '.';
          m.edit(output);
        });
      }).catch((error) => {
        message.channel.send(`Error: ${error.message}`);
      });
    });
  },
};

function checkBans() {
  const now = new Date();
  Ban.find({ bannedTill: { $lte: now } }).then((docs) => {
    docs.forEach((doc) => {
      const guild = client.guilds.cache.get(doc.guildId);
      const userId = doc.discordId;
      guild.members.unban(userId).then(() => {
        sendLogMessage(guild, `Unbanned <@${userId}>.`);
      });
      doc.delete();
    });
  });
}
checkBans();
new CronJob('* * * * *', checkBans).start();
