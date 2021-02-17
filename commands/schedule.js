const Discord = require('discord.js');
const moment = require('moment-timezone');
const { Schedule } = require('../db/models/scheduled_message');
const sendAlertMessage = require('../utils/sendAlertMessage');

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
          sendAlertMessage(message.channel, `Current time: ${moment().utc().format('YYYY-MM-DD h:mm A z')}
_Scheduled messages_
${messages.join('\n')}`, 'info');
        } else {
          sendAlertMessage(message.channel, `There are no scheduled messages.\n${newUsage}\``, 'info');
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
      // eslint-disable-next-line consistent-return
      return sendAlertMessage(message.channel, `Wrong action. Allowed actions: ${actions}.\n${newUsage}`, 'warning');
    }

    let id;
    /* eslint-disable no-case-declarations */
    switch (action) {
      case ADD:
        if (args.length < 3) {
          // eslint-disable-next-line consistent-return
          return sendAlertMessage(message.channel, 'Wrong amount of arguments. Example: `!schedule add #channel 2020-01-01 00:00 CET`', 'warning');
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
          // eslint-disable-next-line consistent-return
          return sendAlertMessage(message.channel, 'Couldn\'t find a channel!', 'warning');
        }

        let tz = args.pop();
        if (tz === 'CEST') { tz = 'CET'; }
        if (tz === 'AEST') { tz = 'Australia/Sydney'; } // https://stackoverflow.com/questions/20753898

        const dateStr = args.slice(2).join(' ');
        const date = moment.tz(dateStr, 'YYYY-MM-DD h:mm A', tz);

        if (date < new Date()) {
          // eslint-disable-next-line consistent-return
          return sendAlertMessage(message.channel, `The date is in the past! ${newUsage}`, 'warning');
        }

        const dateFormat = date.format('YYYY-MM-DD h:mm A z');

        sendAlertMessage(message.channel, `Scheduling post for ${channel} channel at ${dateFormat}.
Send the text of the message. Use \`{roleName}\` instead of real pings.
I'm waiting 5 minutes. Type \`cancel\` to cancel.`, 'info').then(() => {
          message.channel.awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 5 * 60000, errors: ['time'] }).then((collected) => {
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
              sendAlertMessage(message.channel, 'Message scheduled.', 'success');
            });
          }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
        });

        break;

      case SHOW:
        id = args[1];

        Schedule.findOne({ guild: message.guild.id, _id: id, sent: false }).then((doc) => {
          if (doc) {
            sendAlertMessage(message.channel, `<#${doc.channel}> ${moment.tz(doc.date, 'UTC').format('YYYY-MM-DD h:mm A z')}\n\n${doc.message}`, 'info');
          } else {
            sendAlertMessage(message.channel, `There is no scheduled message with the id ${id}.`, 'warning');
          }
        });

        break;
      case EDIT:
        id = args[1];

        Schedule.findOne({ guild: message.guild.id, _id: id, sent: false }).then((doc) => {
          if (doc) {
            sendAlertMessage(message.channel, `Editing <#${doc.channel}> ${moment.tz(doc.date, 'UTC').format('YYYY-MM-DD h:mm A z')}
Send the new text of the message. Use \`{roleName}\` instead of real pings.
I'm waiting 1 minute. Type \`cancel\` to cancel.`, 'info').then(() => {
              // eslint-disable-next-line consistent-return
              message.channel.awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 60000, errors: ['time'] }).then((collected) => {
                const { content } = collected.first();
                if (content.toLowerCase() === 'cancel') {
                  return sendAlertMessage(message.channel, 'Command cancelled.', 'error');
                }

                // eslint-disable-next-line no-param-reassign
                doc.message = content;
                doc.save().then(() => {
                  sendAlertMessage(message.channel, 'Message edited.', 'success');
                });
              }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
            });
          } else {
            sendAlertMessage(message.channel, `There is no scheduled message with the id ${id}.`, 'warning');
          }
        });
        break;
      case DELETE:
        id = args[1];

        Schedule.findOne({ guild: message.guild.id, _id: id, sent: false }).then((doc) => {
          if (doc) {
            doc.delete().then(() => {
              sendAlertMessage(message.channel, 'Scheduled message deleted.', 'success');
            });
          } else {
            sendAlertMessage(message.channel, `There is no scheduled message with the id ${id}.`, 'warning');
          }
        });

        break;
      default:
        break;
    }
  },
};
