const { client } = require('../bot');

module.exports.engineStyles = [
  {
    name: 'Turning',
    uid: 'turn',
    icon: client.getEmote('turn', '813098792886861874'),
    ranked: false,
  },
  {
    name: 'Balanced',
    uid: 'bal',
    icon: client.getEmote('balanced', '813098792638218262'),
    ranked: false,
  },
  {
    name: 'Acceleration',
    uid: 'accel',
    icon: client.getEmote('accel', '813098792622227468'),
    ranked: false,
  },
  {
    name: 'Drift',
    uid: 'drift',
    icon: client.getEmote('drift', '813098792907440178'),
    ranked: false,
  },
  {
    name: 'Speed',
    uid: 'speed',
    icon: client.getEmote('speed', '813098792907046922'),
    ranked: false,
  },
];
