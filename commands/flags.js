module.exports = {
  name: 'flags',
  description: 'Show country flags.',
  execute(message, args) {
    const { flags } = message.client;

    const halfLength = Math.floor(flags.length / 2);
    const chunks = [
      flags.slice(0, halfLength),
      flags.slice(halfLength),
    ];

    chunks.map((chunk) => {
      message.channel.send({ embed: { description: chunk.join(' ') } });
    });
  },
};
