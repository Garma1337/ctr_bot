const { client } = require('../bot');

module.exports.engineStyles = [
  {
    name: 'Turning',
    uid: 'turn',
    icon: client.getEmote('turn', '813098792886861874'),
  },
  {
    name: 'Balanced',
    uid: 'bal',
    icon: client.getEmote('balanced', '813098792638218262'),
  },
  {
    name: 'Acceleration',
    uid: 'accel',
    icon: client.getEmote('accel', '813098792622227468'),
  },
  {
    name: 'Drift',
    uid: 'drift',
    icon: client.getEmote('drift', '813098792907440178'),
  },
  {
    name: 'Speed',
    uid: 'speed',
    icon: client.getEmote('speed', '813098792907046922'),
  },
];
