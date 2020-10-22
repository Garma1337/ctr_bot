const fetchMessages = require('./fetchMessages');
const { parse } = require('./SignupParsers');
const { parsers } = require('./SignupParsers');

module.exports = function getSignupsData(channel, doc) {
  const parser = parsers[doc.parser];

  const SEPARATOR = ',';
  // const firstRow = ['#', 'Team Name', 'PSN 1', 'PSN 2', 'Discord 1 Tag', 'Discord 1 ID', 'Discord 2 Tag', 'Discord 2 ID', 'Host', 'Author Tag', 'Author ID', 'Is Valid'];
  let firstRow;
  const out = [];

  // out.push(firstRow.join(SEPARATOR));

  // const table = [];

  return fetchMessages(channel, 500).then((messages) => {
    let count = 0;
    let hosts = 0;

    const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    sortedMessages.forEach((m, index) => {
      if (index === 0) return; // ignore first message

      if (m.type === 'PINS_ADD' || m.author.bot) {
        return;
      }

      count += 1;

      const data = parse(m, parser.fields);

      if (data.host) hosts += 1;

      data.valid = !data.errors.length;
      delete data.errors;

      if (!firstRow) {
        firstRow = ['#', ...Object.keys(data)];
      }

      // eslint-disable-next-line max-len
      // '#', 'Team Name', 'PSN 1', 'PSN 2', 'Discord 1 Tag', 'Discord 1 ID', 'Discord 2 Tag', 'Discord 2 ID', 'Host', 'Author Tag', 'Author ID', 'Is Valid'

      // eslint-disable-next-line max-len
      // const row = [i, data.teamName, data.psn1, data.psn2, data.discordTag1, data.discordId1, data.discordTag2, data.discordId2, data.host, data.authorTag, data.authorId, data.valid];
      const row = [count, ...Object.values(data)];
      out.push(row.join(SEPARATOR));

      data.createdAt = m.createdTimestamp;
      // table.push(data);
      // console.log(`OK: ${isValid}`);
      // console.log(data);
      // console.log('----------');
    });

    out.unshift(firstRow);

    // console.table(table);

    return { count, hosts, rows: out };
  });
};
