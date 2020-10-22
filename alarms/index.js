const { CronJob } = require('cron');
const sendLogMessage = require('../utils/sendLogMessage');
const Schedule = require('../db/models/scheduled_messages');
const SignupsChannel = require('../db/models/signups_channels');
const { parsers } = require('../utils/SignupParsers');
const getSignupsData = require('../utils/getSignupsData');

/* eslint-disable no-unused-vars,no-console */
const timer = (client, targetDate, callback) => {
  const now = new Date();
  const target = targetDate;
  // console.log(target, now);
  if (target <= now) {
    callback(client);
    return;
  }

  // console.log('tick');
  setTimeout(timer, 1000, client, targetDate, callback); // tick every second
};

const setAlarm = (client, date, callback) => {
  const now = new Date();
  const target = date;
  console.log('setAlarm', target, now);
  if (target > now) {
    timer(client, date, callback);
  } else {
    console.log('target < now');
  }
};

// callbacks

const openSignups = (client, doc) => {
  console.log('openSignups');
  const guild = client.guilds.cache.get(doc.guild);
  const channel = guild.channels.cache.get(doc.channel);
  const parser = parsers[doc.parser];

  channel.createOverwrite(channel.guild.roles.everyone, { SEND_MESSAGES: true }).then(() => {
    sendLogMessage(guild, `Changed permission in channel${channel} for everyone SEND_MESSAGES: true`);
    channel.send(parser.template)
      .then((msg) => {
        msg.pin().then(() => {
          const filter = channel.messages.cache.filter((m) => m.type === 'PINS_ADD' && m.author.id === client.user.id);
          filter.last().delete();
        });
      })
      .catch(console.error);
  }).catch((error) => {
    sendLogMessage(guild, error.toString());
  });
};

const closeSignups = (client, doc) => {
  console.log('closeSignups');
  const guild = client.guilds.cache.get(doc.guild);
  const channel = guild.channels.cache.get(doc.channel);
  channel.send('Signups are now closed!').catch(console.error);
  channel.createOverwrite(channel.guild.roles.everyone, { SEND_MESSAGES: false }).then(() => {
    sendLogMessage(guild, `Changed permission in channel${channel} for everyone SEND_MESSAGES: false`);
  }).catch(console.error)
    .then(async () => {
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
  message = message.replace('{everyone}', '@everyone').replace('{here}', '@here');

  channel.send(message).then((sentMessage) => {

  });
};

const areDatesEqualsToMinutes = (date, now) => date.getUTCFullYear() === now.getUTCFullYear()
  && date.getUTCMonth() === now.getUTCMonth()
  && date.getUTCDate() === now.getUTCDate()
  && date.getUTCHours() === now.getUTCHours()
  && date.getUTCMinutes() === now.getUTCMinutes();

// scheduled messages
const scheduler = async (client) => {
  // console.log('tick scheduler');
  const now = new Date();
  await Schedule.find({ sent: false }).then((docs) => {
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

// alarms
const alarms = (client) => {
  // scheduler(client);

  new CronJob('* * * * *', () => {
    scheduler(client);
  }).start();
};

module.exports = alarms;
