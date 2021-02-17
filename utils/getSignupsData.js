const fetchMessages = require('./fetchMessages');
const { parse } = require('./SignupParsers');
const { parsers } = require('./SignupParsers');

module.exports = function getSignupsData(channel, doc) {
  const parser = parsers[doc.parser];

  const SEPARATOR = ',';
  let firstRow;
  const out = [];

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

      const row = [count, ...Object.values(data)];
      out.push(row.join(SEPARATOR));

      data.createdAt = m.createdTimestamp;
    });

    out.unshift(firstRow);

    return { count, hosts, rows: out };
  });
};
