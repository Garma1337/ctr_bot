const Room = require('../db/models/rooms');
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'rooms',
  description: 'Ranked lobby rooms',
  guildOnly: true,
  aliases: ['room'],
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message, args) {
    if (!args.length) {
      Room.find({ guild: message.guild.id }).sort({ number: 1 })
        .then((docs) => {
          if (!docs.length) {
            return sendAlertMessage(message.channel, 'There are no rooms.', 'info');
          }

          const rooms = docs.map((doc) => {
            const channel = message.guild.channels.cache.find((c) => c.name === `ranked-room-${doc.number}`);
            if (channel) {
              return `${channel} ${doc.lobby}`;
            }

            return `DELETED_CHANNEL ${doc.lobby}`;
          });

          sendAlertMessage(message.channel, rooms.join('\n'), 'success');
        });
    } else {
      const isStaff = isStaffMember(message.member);

      if (!isStaff) {
        return sendAlertMessage(message.channel, 'You don\'t have permission to do that!', 'warning');
      }

      const action = args.shift();

      if (action === 'free') {
        const number = args.shift();
        if (number === 'all') {
          Room.find({ guild: message.guild.id })
            .then((docs) => {
              const promises = docs.map((doc) => {
                doc.lobby = null;
                return doc.save();
              });

              Promise.all(promises).then(() => {
                sendAlertMessage(message.channel, 'All rooms were freed.', 'success');
              });
            });
        } else {
          Room.findOne({ guild: message.guild.id, number }).then((doc) => {
            if (!doc) {
              return sendAlertMessage(message.channel, 'There is no room with this number.', 'warning');
            }

            doc.lobby = null;
            doc.save().then(() => { sendAlertMessage(message.channel, 'Room was freed.', 'success'); });
          });
        }
      }
    }
  },
};
