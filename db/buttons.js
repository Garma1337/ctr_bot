const { MessageButton } = require('discord-buttons');

module.exports.yesButton = new MessageButton()
  .setStyle('grey')
  .setLabel('Yes')
  .setEmoji('✅')
  .setID('yes');

module.exports.noButton = new MessageButton()
  .setStyle('grey')
  .setLabel('No')
  .setEmoji('❌')
  .setID('no');

module.exports.maybeButton = new MessageButton()
  .setStyle('grey')
  .setLabel('Maybe')
  .setEmoji('❔')
  .setID('maybe');

module.exports.joinLobbyButton = new MessageButton()
  .setStyle('grey')
  .setLabel('Join')
  .setEmoji('✅')
  .setID('join_lobby');

module.exports.leaveLobbyButton = new MessageButton()
  .setStyle('grey')
  .setLabel('Leave')
  .setEmoji('❌')
  .setID('leave_lobby');

module.exports.deleteLobbyButton = new MessageButton()
  .setStyle('grey')
  .setLabel('Delete')
  .setEmoji('🗑️')
  .setID('delete_lobby');
