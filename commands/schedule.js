const Discord = require('discord.js');
const moment = require('moment-timezone');
const Schedule = require('../db/models/scheduled_messages');

module.exports = {
  name: 'schedule',
  description: 'Schedule bot posts.',
  guildOnly: true,
  permissions: ['MANAGE_ROLES'],
  execute(message, args) {
    const newUsage = 'To add a new one: `!schedule add #channel 2020-01-01 00:00 CET`';

    if (args.length === 0) {
      Schedule.find({ guild: message.guild.id, sent: false }).then((docs) => {
        if (docs.length) {
          const messages = docs.map((doc) => `\`${doc.id}\`: <#${doc.channel}> ${moment.tz(doc.date, 'UTC').format('YYYY-MM-DD h:mm A z')}`);
          message.channel.send(`Current time: ${moment().utc().format('YYYY-MM-DD h:mm A z')}
_Scheduled messages_
${messages.join('\n')}`);
        } else {
          message.channel.send(`There is no scheduled messages.\n${newUsage}\``);
        }
      });
      return;
    }

    const action = args[0];

    const ADD = 'add';
    const EDIT = 'edit';
    const DELETE = 'delete';
    const SHOW = 'show';

    const actions = [ADD, EDIT, DELETE, SHOW];
    if (!actions.includes(action)) {
      message.channel.send(`Wrong action. Allowed actions: ${actions}.\n${newUsage}`);
      return;
    }

    let id;
    /* eslint-disable no-case-declarations */
    switch (action) {
      case ADD:
        if (args.length < 3) {
          message.channel.send('Wrong amount of arguments. Example: `!schedule add #channel 2020-01-01 00:00 CET`');
          return;
        }

        let channelArg = args[1];
        let channel;
        if (channelArg.match(Discord.MessageMentions.CHANNELS_PATTERN)) {
          channel = message.mentions.channels.first();
        } else {
          channelArg = channelArg.replace(/^#/, '');
          channel = message.guild.channels.cache.find((c) => c.name === channelArg);
        }

        if (!channel) {
          message.channel.send('Couldn\'t find a channel!');
          return;
        }

        let tz = args.pop();
        if (tz === 'CEST') { tz = 'CET'; }
        if (tz === 'AEST') { tz = 'Australia/Sydney'; } // https://stackoverflow.com/questions/20753898

        const dateStr = args.slice(2).join(' ');
        const date = moment.tz(dateStr, 'YYYY-MM-DD h:mm A', tz);

        if (date < new Date()) {
          message.channel.send(`The date is in the past! ${newUsage}`);
          return;
        }
        // date = date.utc();

        const dateFormat = date.format('YYYY-MM-DD h:mm A z');

        message.channel.send(`Scheduling post for ${channel} channel at ${dateFormat}.
Send the text of the message. Use \`{roleName}\` instead of real pings.
I'm waiting 5 minutes. Type \`cancel\` to cancel.`).then(() => {
          message.channel
            .awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 5 * 60000, errors: ['time'] })
            .then((collected) => {
              const { content } = collected.first();
              if (content.toLowerCase() === 'cancel') {
                throw new Error('cancel');
              }
              const scheduledMessage = new Schedule();
              scheduledMessage.date = date;
              scheduledMessage.guild = message.guild.id;
              scheduledMessage.channel = channel.id;
              scheduledMessage.message = content;
              scheduledMessage.save().then(() => {
                message.channel.send('Message scheduled.`');
              });
            })
            .catch(() => message.channel.send('Command cancelled.'));
        });

        break;

      case SHOW:
        // !schedule show 1
        id = args[1];

        Schedule.findOne({ guild: message.guild.id, _id: id, sent: false }).then((doc) => {
          if (doc) {
            message.channel.send(`<#${doc.channel}> ${moment.tz(doc.date, 'UTC').format('YYYY-MM-DD h:mm A z')}`);
            message.channel.send(`${doc.message}`);
          } else {
            message.channel.send(`There is no scheduled with id ${id}`);
          }
        });

        break;
      case EDIT:
        id = args[1];

        Schedule.findOne({ guild: message.guild.id, _id: id, sent: false }).then((doc) => {
          if (doc) {
            // message.channel.send(`<#${doc.channel}> ${moment.tz(doc.date, 'UTC').format('YYYY-MM-DD h:mm A z')}`);
            // message.channel.send(`${doc.message}`);
            message.channel.send(`Editing <#${doc.channel}> ${moment.tz(doc.date, 'UTC').format('YYYY-MM-DD h:mm A z')}
Send the new text of the message. Use \`{roleName}\` instead of real pings.
I'm waiting 1 minute. Type \`cancel\` to cancel.`).then(() => {
              message.channel
                .awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 60000, errors: ['time'] })
                .then((collected) => {
                  const { content } = collected.first();
                  if (content.toLowerCase() === 'cancel') {
                    message.channel.send('Command cancelled.');
                    return;
                  }
                  // eslint-disable-next-line no-param-reassign
                  doc.message = content;
                  doc.save().then(() => {
                    message.channel.send('Message edited.');
                  });
                })
                .catch(() => message.channel.send('Command cancelled.'));
            });
          } else {
            message.channel.send(`There is no scheduled with id ${id}`);
          }
        });
        break;

      case DELETE:
        id = args[1];

        Schedule.findOne({ guild: message.guild.id, _id: id, sent: false }).then((doc) => {
          if (doc) {
            doc.delete().then(() => {
              message.channel.send('Scheduled message deleted.');
            });
          } else {
            message.channel.send(`There is no scheduled with id ${id}`);
          }
        });
        break;
    }
  },
};
