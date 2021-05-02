const config = require('../../config');

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
      key: /psn ?4/i,
      name: 'psn4',
      type: 'nickname',
    },
    {
      key: /psn ?sub ?1/i,
      name: 'psnSub1',
      type: 'nickname',
      optional: true,
    },
    {
      key: /psn ?sub ?2/i,
      name: 'psnSub2',
      type: 'nickname',
      optional: true,
    },
    {
      key: /psn ?sub ?3/i,
      name: 'psnSub3',
      type: 'nickname',
      optional: true,
    },
    {
      key: /psn ?sub ?4/i,
      name: 'psnSub4',
      type: 'nickname',
      optional: true,
    },
    {
      key: /psn ?sub ?5/i,
      name: 'psnSub5',
      type: 'nickname',
      optional: true,
    },
    {
      key: /psn ?sub ?6/i,
      name: 'psnSub6',
      type: 'nickname',
      optional: true,
    },
  ],
  template: `Team Name: Template Team
Captain: <@!${config.bot_user_id}>
PSN 1: ctr_tourney_bot
PSN 2: ctr_tourney_bot_2
PSN 3: ctr_tourney_bot_3
PSN 4: ctr_tourney_bot_4
PSN Sub 1: ctr_tourney_bot_sub_1
PSN Sub 2: ctr_tourney_bot_sub_2
PSN Sub 3: ctr_tourney_bot_sub_3
PSN Sub 4: ctr_tourney_bot_sub_4
PSN Sub 4: ctr_tourney_bot_sub_5
PSN Sub 4: ctr_tourney_bot_sub_6 (substitute players are optional)`,
};
