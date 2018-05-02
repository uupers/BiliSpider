const { httpGetAsync, sleep } = require('../utils');
const { client } = require('../..');
const schedule = require('node-schedule');

const url = 'http://www.xdaili.cn/ipagent/freeip/getFreeIps';

const getListAsync = (page = 1) => {
    return httpGetAsync(url, { query: [{ page }] })
        .then(JSON.parse)
        .then((res) => {
            return res.RESULT.rows || [ ];
        }).then((arr) => {
            return arr.map((item) => {
                return `http://${item.ip}:${item.port}`;
            });
        });
};

const appendList = async () => {
    await sleep(3000);
    if (client.getCurrent()) {
        for (const i in Array(2)) {
            client.getCurrent().appendSpiders(await getListAsync(i));
            await sleep(500);
        }
    }
};

module.exports.process = async () => {
    // get per 5 min
    schedule.scheduleJob('*/5 * * * *', () => {
        appendList();
    });
    await appendList();
};
