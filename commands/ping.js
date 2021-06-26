const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'ping',
  description: 'Ping!',
  cooldown: 10,
  execute(message) {
    const { client } = message;
    message.channel.send('Pong!').then((m) => {
      const data = [
        `**API**: \`${Math.round(client.ws.ping)}ms\``,
        `**Server**: \`${m.createdAt - message.createdAt}ms\``,
        `**Uptime**: \`${client.uptime}ms\``,
      ];

      m.delete();
      sendAlertMessage(message.channel, data.join('\n'), 'success');
    });
  },
};
