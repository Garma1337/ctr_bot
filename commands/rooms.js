const Room = require('../db/models/rooms');
const isStaffMember = require('../utils/isStaffMember');

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
            return message.channel.send('No rooms.');
          }
          const rooms = docs.map((doc) => {
            const channel = message.guild.channels.cache.find((c) => c.name === `ranked-room-${doc.number}`);
            if (channel) {
              return `${channel} ${doc.lobby}`;
            }
            return `DELETED_CHANNEL ${doc.lobby}`;
          });
          message.channel.send(rooms);
        });
    } else {
      const isStaff = isStaffMember(message.member);

      if (!isStaff) {
        return message.channel.send('You don\'t have permission to do that!');
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
                message.channel.send('All rooms were freed.');
              });
            });
        } else {
          Room.findOne({ guild: message.guild.id, number })
            .then((doc) => {
              if (!doc) {
                return message.channel.send('There is no room with this number.');
              }
              doc.lobby = null;
              doc.save().then(() => { message.channel.send('Room was freed.'); });
            });
        }
      }
    }
  },
};
