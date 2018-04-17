const spider = require('./spider');
const utils = require('./utils');

const client = {
    process: spider.process,
    loop: spider.loop,
    setOutput: utils.setOutput
};

module.exports = {
    client
};
