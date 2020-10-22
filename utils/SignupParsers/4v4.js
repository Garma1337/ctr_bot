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
      type: 'plain',
    },
    {
      key: /psn ?2/i,
      name: 'psn2',
      type: 'plain',
    },
    {
      key: /psn ?3/i,
      name: 'psn3',
      type: 'plain',
    },
    {
      key: /psn ?4/i,
      name: 'psn4',
      type: 'plain',
    },
    {
      key: /psn ?sub ?1/i,
      name: 'psnSub1',
      type: 'plain',
      optional: true,
    },
    {
      key: /psn ?sub ?2/i,
      name: 'psnSub2',
      type: 'plain',
      optional: true,
    },
  ],
  template: `Team Name: Template Team
Captain: <@635410532786110464>
PSN 1: ctr_tourney_bot
PSN 2: ctr_tourney_bot_2
PSN 3: ctr_tourney_bot_3
PSN 4: ctr_tourney_bot_4
PSN Sub 1: ctr_tourney_bot_sub_1
PSN Sub 2: ctr_tourney_bot_sub_2 (substitute players are optional)`,
};
