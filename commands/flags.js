module.exports = {
  name: 'flags',
  description: 'Show country flags.',
  execute(message) {
    const { flags } = message.client;

    const halfLength = Math.floor(flags.length / 2);
    const chunks = [
      flags.slice(0, halfLength),
      flags.slice(halfLength),
    ];

    // eslint-disable-next-line array-callback-return
    chunks.map((chunk) => {
      message.channel.send({ embed: { description: chunk.join(' ') } });
    });
  },
};
