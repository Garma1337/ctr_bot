const SignupsChannel = require('../db/models/signups_channels');
const getSignupsData = require('../utils/getSignupsData');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'parse_signups',
  description: 'Parsing signups',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  async execute(message, args) {
    const { guild } = message;

    if (!args.length) {
      return sendAlertMessage(message.channel, 'You should specify the channel.', 'warning');
    }

    let channel;
    if (message.mentions.channels.size) {
      channel = message.mentions.channels.first();
    } else {
      const channelName = args[0];
      channel = guild.channels.cache.find((c) => c.name === channelName);
    }

    const doc = await SignupsChannel.findOne({ guild: message.guild.id, channel: channel.id });
    if (!doc) {
      return sendAlertMessage(message.channel, 'This channel is not defined as signups channel. Use `!signups_channels` command.', 'warning');
    }

    const data = await getSignupsData(channel, doc);

    const txt = data.rows.join('\n');
    message.channel.send(`${data.count} signups\n${data.hosts} hosts`, {
      files: [{
        attachment: Buffer.from(txt, 'utf-8'),
        name: 'signups.csv',
      }],
    });
  },
};
