const config = require('../config.js');

const sendLogMessage = (guild, message, noPing = false) => {
  const logChannel = guild.channels.cache.find((c) => c.name === config.channels.tourney_log_channel);
  if (logChannel) {
    if (noPing) {
      logChannel.send('...').then((m) => {
        // eslint-disable-next-line no-console
        m.edit(message).then().catch(console.error);
      });
    } else {
      logChannel.send(message);
    }
  } else {
    // eslint-disable-next-line no-console
    console.error(`Channel "${config.channels.tourney_log_channel}" does not exist.`);
    // eslint-disable-next-line no-console
    console.log(message);
  }
};

module.exports = sendLogMessage;
