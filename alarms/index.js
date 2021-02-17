const { CronJob } = require('cron');
const { ScheduledMessage } = require('../db/models/scheduled_message');
const { SignupsChannel } = require('../db/models/signups_channel');
const { parsers } = require('../utils/signups_parsers');
const formatRolePings = require('../utils/formatRolePings');
const getSignupsData = require('../utils/getSignupsData');
const sendLogMessage = require('../utils/sendLogMessage');

/* eslint-disable no-unused-vars,no-console */
const timer = (client, targetDate, callback) => {
  const now = new Date();
  if (targetDate <= now) {
    callback(client);
    return;
  }

  setTimeout(timer, 1000, client, targetDate, callback); // tick every second
};

const openSignups = (client, doc) => {
  const guild = client.guilds.cache.get(doc.guild);
  const channel = guild.channels.cache.get(doc.channel);
  const parser = parsers[doc.parser];

  channel.createOverwrite(channel.guild.roles.everyone, { SEND_MESSAGES: true }).then(() => {
    sendLogMessage(guild, `Changed permission in channel${channel} for everyone SEND_MESSAGES: true`);

    channel.send(parser.template).then((msg) => {
      msg.pin().then(() => {
        const filter = channel.messages.cache.filter((m) => m.type === 'PINS_ADD' && m.author.id === client.user.id);
        filter.last().delete().then();
      });
    }).catch(console.error);
  }).catch((error) => {
    sendLogMessage(guild, error.toString());
  });
};

const closeSignups = (client, doc) => {
  const guild = client.guilds.cache.get(doc.guild);
  const channel = guild.channels.cache.get(doc.channel);

  channel.send('Signups are now closed!').catch(console.error);
  channel.createOverwrite(channel.guild.roles.everyone, { SEND_MESSAGES: false }).then(() => {
    sendLogMessage(guild, `Changed permission in channel${channel} for everyone SEND_MESSAGES: false`);
  }).catch(console.error).then(async () => {
    const data = await getSignupsData(channel, doc);
    const txt = data.rows.join('\n');
    sendLogMessage(guild, {
      content: `${data.count} signups\n${data.hosts} hosts`,
      files: [{
        attachment: Buffer.from(txt, 'utf-8'),
        name: 'signups.csv',
      }],
    });
  });
};

const sendScheduledMessage = (client, scheduledMessage) => {
  const channel = client.channels.cache.get(scheduledMessage.channel);
  if (!channel) {
    // eslint-disable-next-line no-underscore-dangle
    console.error(`Scheduled message${scheduledMessage._id} error: no channel.`);
    return;
  }

  let { message } = scheduledMessage;

  const guild = client.guilds.cache.get(scheduledMessage.guild);
  message = formatRolePings(message, guild.roles.cache);

  channel.send(message).then();
};

const areDatesEqualsToMinutes = (date, now) => date.getUTCFullYear() === now.getUTCFullYear()
  && date.getUTCMonth() === now.getUTCMonth()
  && date.getUTCDate() === now.getUTCDate()
  && date.getUTCHours() === now.getUTCHours()
  && date.getUTCMinutes() === now.getUTCMinutes();

const scheduler = async (client) => {
  const now = new Date();
  await ScheduledMessage.find({ sent: false }).then((docs) => {
    docs.forEach((doc) => {
      const { date } = doc;
      if (areDatesEqualsToMinutes(date, now)) {
        // eslint-disable-next-line no-param-reassign
        doc.sent = true;
        doc.save();
        sendScheduledMessage(client, doc);
      }
    });
  });

  await SignupsChannel.find().then((docs) => {
    docs.forEach((doc) => {
      const { open, close } = doc;
      if (areDatesEqualsToMinutes(open, now)) {
        openSignups(client, doc);
      }
      if (areDatesEqualsToMinutes(close, now)) {
        closeSignups(client, doc);
      }
    });
  });
};

const alarms = (client) => {
  new CronJob('* * * * *', () => {
    scheduler(client).then();
  }).start();
};

module.exports = alarms;
