/* eslint-disable consistent-return */
const Discord = require('discord.js');
const moment = require('moment-timezone');
const { SignupsChannel } = require('../db/models/signups_channel');
const { parsers } = require('../utils/signups_parsers');

function parseDateString(dateString) {
  const split = dateString.split(/\s+/);
  let tz = split.pop();

  if (tz === 'CEST') { tz = 'CET'; }
  if (tz === 'AEST') { tz = 'Australia/Sydney'; } // https://stackoverflow.com/questions/20753898

  const s = split.join(' ');
  return moment.tz(s, 'YYYY-MM-DD h:mm A', tz);
}

async function openDateInput(message, confirmMessage, getText) {
  const awaitMessagesFilter = (m) => m.author.id === message.author.id;
  const awaitMessagesOptions = { max: 1, time: 5 * 60000, errors: ['time'] };

  let openDate = null;
  let error = null;

  do {
    await confirmMessage.edit(getText(error));
    error = '';

    // eslint-disable-next-line no-loop-func,max-len
    await message.channel.awaitMessages(awaitMessagesFilter, awaitMessagesOptions).then((collected) => {
      const collectedMessage = collected.first();
      const { content } = collectedMessage;
      collectedMessage.delete();

      if (content.toLowerCase() === 'cancel') {
        throw new Error('cancel');
      }

      openDate = parseDateString(content);
    });

    if (!openDate.isValid()) {
      error = 'The date you\'ve entered is invalid. Please, try again. Say `cancel` if you want to cancel the command execution.';
    } else if (moment() > openDate) {
      await confirmMessage.edit('The date you\'ve entered is in the past. Do you wish to continue with it? (yes/no)');
      // eslint-disable-next-line no-loop-func,max-len
      await message.channel.awaitMessages(awaitMessagesFilter, awaitMessagesOptions).then((collected) => {
        const collectedMessage = collected.first();
        const { content } = collectedMessage;
        collectedMessage.delete();

        if (content.toLowerCase() !== 'yes') {
          error = 'The date you\'ve entered is in the past. Please, try again. Say `cancel` if you want to cancel the command execution.';
        }
        if (content.toLowerCase() === 'cancel') {
          throw new Error('cancel');
        }
      });
    }
  } while (error);

  return openDate;
}

async function closeDateInput(openDate, message, confirmMessage, getText) {
  const awaitMessagesFilter = (m) => m.author.id === message.author.id;
  const awaitMessagesOptions = { max: 1, time: 5 * 60000, errors: ['time'] };

  let closeDate = null;
  let error = null;

  do {
    await confirmMessage.edit(getText(error));
    error = '';

    // eslint-disable-next-line no-loop-func,max-len
    await message.channel.awaitMessages(awaitMessagesFilter, awaitMessagesOptions).then((collected) => {
      const collectedMessage = collected.first();
      const { content } = collectedMessage;
      collectedMessage.delete();

      if (content.toLowerCase() === 'cancel') {
        throw new Error('cancel');
      }

      closeDate = parseDateString(content);
    });

    if (!closeDate.isValid()) {
      error = 'The date you\'ve entered is invalid. Please, try again. Say `cancel` if you want to cancel the command execution.';
    } else if (openDate > closeDate) {
      error = 'The date you\'ve entered is before the open date. Please, try again. Say `cancel` if you want to cancel the command execution.';
    } else if (moment() > closeDate) {
      await confirmMessage.edit('The date you\'ve entered is in the past. Do you wish to continue with it? (yes/no)');
      // eslint-disable-next-line no-loop-func,max-len
      await message.channel.awaitMessages(awaitMessagesFilter, awaitMessagesOptions).then((collected) => {
        const collectedMessage = collected.first();
        const { content } = collectedMessage;
        collectedMessage.delete();

        if (content.toLowerCase() !== 'yes') {
          error = 'The date you\'ve entered is in the past. Please, try again. Say `cancel` if you want to cancel the command execution.';
        }

        if (content.toLowerCase() === 'cancel') {
          throw new Error('cancel');
        }
      });
    }
  } while (error);

  return closeDate;
}

const dateFormatExample = '2020-10-01 1:00 AM CET';

module.exports = {
  name: 'signups_channels',
  description: 'Manage signups channels',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  aliases: ['signups_channel', 'signup_channels', 'signup_channel'],
  execute(message, args) {
    if (!args.length) {
      return SignupsChannel.find({ guild: message.guild.id }).then((docs) => {
        if (!docs.length) {
          return message.channel.send('There are no channels.\nTo add a new signups channel use: `!signups_channels add #channel`');
        }

        const out = docs.map((doc) => {
          const open = doc.open ? moment.tz(doc.open, 'UTC').format('YYYY-MM-DD h:mm A z') : 'not set';
          const close = doc.close ? moment.tz(doc.close, 'UTC').format('YYYY-MM-DD h:mm A z') : 'not set';
          return `<#${doc.channel}>: ${doc.parser}, open: ${open}, close: ${close}`;
        }).join('\n');

        message.channel.send(`**List of signups channels**
To add a new signups channel use: \`!signups_channels add #channel\`
To see the signup message for the specific channel use: \`!signups_channels show #channel\`

${out}`);
      });
    }

    const action = args[0];

    const ADD = 'add';
    const EDIT = 'edit';
    const DELETE = 'delete';
    const SHOW = 'show';

    const actions = [ADD, EDIT, DELETE, SHOW];
    if (!actions.includes(action)) {
      message.channel.send(`Wrong action. Allowed actions: ${actions.join(', ')}.`);
      return;
    }

    if (args.length < 2) {
      message.channel.send(`Wrong amount of arguments. Example: \`!signups_channels ${action} #channel\``);
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
    }

    const parserNames = Object.keys(parsers);
    const parsersString = parserNames.map((parser, i) => `${i + 1} - ${parser}`).join('\n');

    /* eslint-disable no-case-declarations */
    // eslint-disable-next-line default-case
    switch (action) {
      case ADD:
      case EDIT:

        if (args.length === 2) {
          const condition = { guild: message.guild.id, channel: channel.id };
          SignupsChannel.findOne(condition).then((doc) => {
            if (doc) {
              if (action === ADD) {
                message.channel.send(`This channel is already defined as signups channel, you will be overriding its properties.
If you need to change only one of the properties use \`!signups_channels edit #channel [parser, open, close, message]\``);
              }

              if (action === EDIT) {
                message.channel.send('If you need to change only one of the properties use `!signups_channels edit #channel [parser, open, close, message]`');
              }
            } else {
              if (action === EDIT) {
                message.channel.send('This channel wasn\'t defined as signups channel, you will be adding a new one.');
              }
              doc = new SignupsChannel(condition);
            }

            message.channel.send(`Select the type of signups parser
(tip: you can use \`!signups_templates\` command to see the template for any type of parser):
${parsersString}`)
              .then(async (confirmMessage) => {
                const awaitMessagesFilter = (m) => m.author.id === message.author.id;
                const awaitMessagesOptions = { max: 1, time: 5 * 60000, errors: ['time'] };

                try {
                  await message.channel.awaitMessages(awaitMessagesFilter, awaitMessagesOptions)
                    .then(async (collected) => {
                      const collectedMessage = collected.first();
                      const { content } = collectedMessage;
                      collectedMessage.delete();

                      const parser = parserNames[+content - 1];
                      if (!parser) {
                        throw new Error('cancel');
                      }
                      doc.parser = parser;
                    });

                  const openDate = await openDateInput(message, confirmMessage,
                    (error) => `**Parser**: ${doc.parser}${error ? `\n${error}` : ''}
Choose the date and time of signups to **open** in the format ${dateFormatExample}:`);

                  const closeDate = await closeDateInput(openDate, message, confirmMessage,
                    (error) => `**Parser**: ${doc.parser}
**Open date**: ${openDate.format('YYYY-MM-DD h:mm A z')}${error ? `\n${error}` : ''}
Choose the date and time of signups to **close** in the format ${dateFormatExample}:`);

                  let dm = '';
                  await confirmMessage.edit(`**Parser**: ${doc.parser}
**Open date**: ${openDate.format('YYYY-MM-DD h:mm A z')}
**Close date**: ${closeDate.format('YYYY-MM-DD h:mm A z')}
Please, enter the message that should be sent to participants when they signup (waiting 5 minutes).
Say \`cancel\` to cancel everything.`);
                  await message.channel.awaitMessages(awaitMessagesFilter, awaitMessagesOptions)
                    .then((collected) => {
                      const collectedMessage = collected.first();
                      const { content } = collectedMessage;
                      collectedMessage.delete();

                      if (content.toLowerCase() === 'cancel') {
                        throw new Error('cancel');
                      }

                      dm = content;
                    });

                  doc.open = openDate;
                  doc.close = closeDate;
                  doc.message = dm;
                  await doc.save();

                  await confirmMessage.edit(`Signup channel has been saved.

**Parser**: ${doc.parser}
**Open date**: ${moment(doc.open).format('YYYY-MM-DD h:mm A z')}
**Close date**: ${moment(doc.close).format('YYYY-MM-DD h:mm A z')}
**Message**: ${doc.message}`);
                } catch (e) {
                  await confirmMessage.edit('Command cancelled.');
                }
              });
          });
        } else if (args.length === 3) {
          const field = args.pop();

          const PARSER = 'parser';
          const OPEN = 'open';
          const CLOSE = 'close';
          const MESSAGE = 'message';

          const fields = [PARSER, OPEN, CLOSE, MESSAGE];
          if (!fields.includes(field)) {
            return message.channel.send(`Wrong field. Choose one from: ${fields.join(', ')}.`);
          }

          const condition = { guild: message.guild.id, channel: channel.id };
          SignupsChannel.findOne(condition).then((doc) => {
            if (!doc) {
              return message.channel.send('This channel is not defined as signups channel. Use `!signups_channels add #channel`');
            }

            const awaitMessagesFilter = (m) => m.author.id === message.author.id;
            const awaitMessagesOptions = { max: 1, time: 5 * 60000, errors: ['time'] };

            // eslint-disable-next-line default-case
            switch (field) {
              case PARSER:
                message.channel.send(`Select the type of signups parser
(tip: you can use \`!signups_templates\` command to see the template for any type of parser):
${parsersString}`).then(async (confirmMessage) => {
                  // eslint-disable-next-line max-len
                  message.channel.awaitMessages(awaitMessagesFilter, awaitMessagesOptions).then(async (collected) => {
                    const collectedMessage = collected.first();
                    const { content } = collectedMessage;
                    collectedMessage.delete();

                    const parser = parserNames[+content - 1];
                    if (!parser) {
                      throw new Error('cancel');
                    }
                    doc.parser = parser;
                    doc.save().then(() => {
                      confirmMessage.edit(`The new parser has been set: ${parser}`);
                    });
                  }).catch(() => {
                    confirmMessage.edit('Command cancelled. ');
                  });
                });
                break;
              case OPEN:
                message.channel.send(`Choose the date and time of signups to **open** in the format ${dateFormatExample}`).then(async (confirmMessage) => {
                  openDateInput(message, confirmMessage,
                    (error) => `${error ? `${error}\n` : ''}
Choose the date and time of signups to **open** in the format ${dateFormatExample}:`)
                    .then((openDate) => {
                      doc.open = openDate;
                      doc.save().then(() => {
                        confirmMessage.edit(`The new open date has been set: ${openDate.format('YYYY-MM-DD h:mm A z')}`);
                      });
                    })
                    .catch(() => {
                      confirmMessage.edit('Command cancelled. ');
                    });
                });
                break;
              case CLOSE:
                message.channel.send(`Choose the date and time of signups to **close** in the format ${dateFormatExample}`).then(async (confirmMessage) => {
                  closeDateInput(doc.open, message, confirmMessage,
                    (error) => `${error ? `${error}\n` : ''}
Choose the date and time of signups to **open** in the format ${dateFormatExample}:`).then((closeDate) => {
                    doc.close = closeDate;
                    doc.save().then(() => {
                      confirmMessage.edit(`The new close date has been set: ${closeDate.format('YYYY-MM-DD h:mm A z')}`);
                    });
                  }).catch((e) => {
                    // eslint-disable-next-line no-console
                    console.error(e);
                    confirmMessage.edit('Command cancelled. ');
                  });
                });
                break;
              case MESSAGE:
                message.channel.send(`Please, enter the message that should be sent to participants when they signup (waiting 5 minutes).
Say \`cancel\` to cancel.`).then(async (confirmMessage) => {
                  // eslint-disable-next-line max-len
                  message.channel.awaitMessages(awaitMessagesFilter, awaitMessagesOptions).then((collected) => {
                    const collectedMessage = collected.first();
                    const { content } = collectedMessage;
                    collectedMessage.delete();

                    if (content.toLowerCase() === 'cancel') {
                      throw new Error('cancel');
                    }

                    doc.message = content;
                    doc.save().then(() => {
                      confirmMessage.edit('The new message has been set.');
                    });
                  }).catch(() => {
                    confirmMessage.edit('Command cancelled. ');
                  });
                });
                break;
            }
          });
        } else {
          return message.channel.send('Wrong amount of arguments in the command ¯\\_(ツ)_/¯');
        }
        break;

      case SHOW:
        SignupsChannel.findOne({ guild: message.guild.id, channel: channel.id }).then((doc) => {
          if (doc) {
            message.channel.send(`**Parser**: ${doc.parser}
**Open date**: ${moment(doc.open).format('YYYY-MM-DD h:mm A z')}
**Close date**: ${moment(doc.close).format('YYYY-MM-DD h:mm A z')}
**Message**: ${doc.message}`);
          } else {
            message.channel.send('This channel is not defined as signups channel.');
          }
        });
        break;

      case DELETE:
        SignupsChannel.findOne({ guild: message.guild.id, channel: channel.id }).then((doc) => {
          if (doc) {
            message.channel.send(`Are you sure you want to remove signups parser from this channel? (yes/no)
The auto check on new messages and \`!parse_signups\` command for this channel will stop working.`).then(async (confirmMessage) => {
              message.channel.awaitMessages(
                (m) => m.author.id === message.author.id,
                { max: 1, time: 60000, errors: ['time'] },
              ).then((collected) => {
                const collectedMessage = collected.first();
                const { content } = collectedMessage;
                collectedMessage.delete();

                if (content.toLowerCase() === 'yes') {
                  doc.delete().then(() => {
                    confirmMessage.edit('Signups parser has been removed from the channel.');
                  });
                } else {
                  throw new Error('cancel');
                }
              }).catch(() => {
                confirmMessage.edit('Command cancelled');
              });
            });
          } else {
            message.channel.send('This channel is not defined as signups channel.');
          }
        });
        break;
    }
  },
};
