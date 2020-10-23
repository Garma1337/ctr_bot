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
      key: /psn ?3/i,
      name: 'psn3',
      type: 'nickname',
    },
    {
      key: /psn ?sub ?1/i,
      name: 'psnSub1',
      type: 'nickname',
      optional: true,
    },
  ],
  template: `Team Name: Template Team
Captain: <@635410532786110464>
PSN 1: ctr_tourney_bot
PSN 2: ctr_tourney_bot_2
PSN 3: ctr_tourney_bot_3
PSN Sub 1: ctr_tourney_bot_sub (substitute players are optional)`,
};
