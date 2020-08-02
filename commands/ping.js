module.exports = {
  name: 'ping',
  description: 'Ping!',
  execute(message) {
    const { client } = message;
    message.channel.send('Pong!').then((m) => {
      const data = [
        'Pong!',
        `**API**: \`${Math.round(client.ws.ping)}ms\``,
        `**Server**: \`${m.createdAt - message.createdAt}ms\``,
        // `**Uptime**: \`${client.uptime}\``,
        '**Koala**: <a:koala:731093968489676831>',
      ];
      m.edit(data.join('\n'));
    });
  },
};
