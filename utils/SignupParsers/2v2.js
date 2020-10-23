module.exports = {
  fields: [
    {
      key: /team ?name/i,
      name: 'teamName',
      type: 'plain',
    },
    {
      key: /captain/i,
      name: 'discordCaptain',
      type: 'mention',
    },
    {
      key: /psn ?1/i,
      name: 'psn1',
      type: 'nickname',
    },
    {
      key: /psn ?2/i,
      name: 'psn2',
      type: 'nickname',
    },
    {
      key: /host/i,
      name: 'host',
      type: 'boolean',
    },
  ],
  template: `Team Name: Template Team
Captain: <@635410532786110464>
PSN 1: ctr_tourney_bot
PSN 2: ctr_tourney_bot_2
Host: yes`,
};
