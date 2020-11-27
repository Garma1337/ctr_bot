const axios = require('axios');

const requestArcGis = async (type) => {
  if (!['Confirmed', 'Deaths', 'Recovered'].includes(type)) {
    throw new Error();
  }

  const url = 'https://services1.arcgis.com/0MSEUqKaxRlEPj5g/arcgis/rest/services/ncov_cases/FeatureServer/1/query';
  const outStatistics = [{ statisticType: 'sum', onStatisticField: type, outStatisticFieldName: 'value' }];
  const confirmed = await axios.get(url, {
    params: {
      f: 'json',
      where: 'Confirmed > 0',
      returnGeometry: 'false',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: '*',
      outStatistics: JSON.stringify(outStatistics),
      cacheHint: 'true',
    },
  });
  return confirmed.data.features.shift().attributes.value;
};

const execute = async (message) => {
  const embed = {
    title: 'COVID-19 Statistics',
    url: 'https://www.arcgis.com/apps/opsdashboard/index.html#/85320e2ea5424dfaaa75ae62e5c06e61',
    fields: [{ name: 'Loading data', value: '...' }],
    description: 'Source: [Johns Hopkins CSSE](https://www.arcgis.com/apps/opsdashboard/index.html#/85320e2ea5424dfaaa75ae62e5c06e61)',
  };

  message.channel.send({ embed }).then(async (msg) => {
    const confirmed = await requestArcGis('Confirmed');
    const deaths = await requestArcGis('Deaths');
    const recovered = await requestArcGis('Recovered');

    embed.fields = [
      { name: 'Confirmed', value: confirmed, inline: true },
      { name: 'Deaths', value: deaths, inline: true },
      { name: 'Recovered', value: recovered, inline: true },
    ];

    msg.edit({
      embed,
    });
  });
};

module.exports = {
  name: 'covid19',
  description: 'COVID-19',
  cooldown: 300,
  aliases: ['corona', 'covid'],
  execute,
};
