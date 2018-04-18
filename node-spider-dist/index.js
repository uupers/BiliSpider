const process = require('./process');
const utils = require('./utils');

const client = {
    process: process.process,
    loop: process.loop,
    setOutput: utils.setOutput
};

module.exports = {
    client
};
