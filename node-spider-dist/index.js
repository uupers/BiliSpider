const process = require('./process');
const utils = require('./utils');
const { NestEvent } = require('./nest');

const client = {
    process: process.process,
    loop: process.loop,
    on: process.on,
    event: NestEvent,
    setOutput: utils.setOutput
};

module.exports = {
    client
};
