module.exports = {
  fields: [
    {
      key: /psn/i,
      name: 'psn',
      type: 'nickname',
    },
    {
      key: /host/i,
      name: 'host',
      type: 'boolean',
    },
  ],
  template: `PSN: ctr_tourney_bot
host: yes`,
};
