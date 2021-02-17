/**
 * Sends a message without pinging anyone
 * @param channel
 * @param message
 */
function sendMessageWithoutPing(channel, message) {
  channel.send('...').then((m) => m.edit(message));
}

module.exports = sendMessageWithoutPing;
