const process = require('./client/process');
const utils = require('./client/utils');
const { NestEvent } = require('./client/nest');

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
