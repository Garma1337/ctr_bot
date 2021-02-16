const mongoose = require('mongoose');
const config = require('../../config');

module.exports = (callback) => {
  mongoose.connect(config.db_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 5000,
    useFindAndModify: false,
  }).then(() => {
    callback();
  });
};
