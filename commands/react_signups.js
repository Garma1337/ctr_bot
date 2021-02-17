const fetchMessages = require('../utils/fetchMessages');
const sendAlertMessage = require('../utils/sendAlertMessage');
const sendLogMessage = require('../utils/sendLogMessage');
const { SignupsChannel } = require('../db/models/signups_channel');
const { parse } = require('../utils/SignupParsers');
const { parsers } = require('../utils/SignupParsers');

module.exports = {
  name: 'react_signups',
  description: 'Check and react on every signup message again.',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  // eslint-disable-next-line consistent-return
  async execute(message, args) {
    if (!args.length) {
      return sendAlertMessage(message.channel, 'You should specify the channel.', 'warning');
    }

    let channel;
    if (message.mentions.channels.size) {
      channel = message.mentions.channels.first();
    } else {
      const channelName = args[0];
      channel = message.guild.channels.cache.find((c) => c.name === channelName);
    }

    let parser;
    const doc = await SignupsChannel.findOne({ guild: message.guild.id, channel: channel.id });
    if (doc) {
      parser = parsers[doc.parser];
    } else {
      return sendAlertMessage(message.channel, 'This channel is not defined as signups channel. Use `!signups_channels` command.', 'warning');
    }

    sendAlertMessage(message.channel, 'Processing...', 'info').then((alert) => {
      alert.delete();

      fetchMessages(channel, 500).then((messages) => {
        const promises = messages.map((m) => {
          if (m.type === 'PINS_ADD' || m.author.bot) {
            return;
          }

          m.reactions.cache.forEach((reaction) => {
            if (reaction.me) {
              reaction.remove();
            }
          });

          const data = parse(m, parser.fields);

          const reactionCatchCallback = () => {
            sendLogMessage(`Couldn't react to the message by ${m.author}.`);
          };

          if (!data.errors.length) {
            // eslint-disable-next-line consistent-return
            return m.react('✅').then().catch(reactionCatchCallback);
          }

          // eslint-disable-next-line consistent-return
          return m.react('❌').then().catch(reactionCatchCallback);
        });

        Promise.all(promises).then(() => {
          alert.delete();
          sendAlertMessage(message.channel, 'Done.', 'success');
        });
      });
    });
  },
};
