module.exports = {
  fields: [
    {
      key: /psn/i,
      name: 'psn',
      type: 'nickname',
    },
    {
      key: /captain/i,
      name: 'captain',
      type: 'boolean',
    },
    {
      key: /ps4 vc/i,
      name: 'ps4vc',
      type: 'boolean',
    },
    {
      key: /discord vc/i,
      name: 'discordvc',
      type: 'boolean',
    },
    {
      key: /host/i,
      name: 'host',
      type: 'boolean',
    },
  ],
  template: `PSN: ctr_tourney_bot
Captain: yes
PS4 VC: no
Discord VC: yes
Host: yes`,
};
