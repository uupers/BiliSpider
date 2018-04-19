const process = require('./process');
const utils = require('./utils');
const { NestEvent } = require('./nest');

const client = {
    process: process.process,
    loop: process.loop,
    on: process.on,
    event: NestEvent,
    getCurrent: process.getCurrent,
    setOutput: utils.setOutput
};

module.exports = {
    client
};
