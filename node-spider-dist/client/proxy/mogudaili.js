const rp = require('request-promise');
const { sleep } = require('../utils');
const { client } = require('../..');
const schedule = require('node-schedule');

const URLS = [
    'http://www.mogumiao.com/proxy/free/listFreeIp',
    'http://www.mogumiao.com/proxy/api/freeIp?count=20'
];

const getListAsync = async (url = URLS[0], index = 0) => {
    try {
        return await rp({
            uri: url,
            header: {
                'Host': 'www.mogumiao.com',
                'Referer': 'http://www.mogumiao.com/web'
            },
            transform: function (body) {
                return typeof body === 'string' ? JSON.parse(body) : body;
            }
        })
            .then((data) => {
                return (data.msg || [ ]).map((item) => {
                    return `http://${item.ip}:${item.port}`;
                });
            });
    } catch (error) {
        if (index < 10) {
            return getListAsync(url, ++index);
        }
        return [ ];
    }
};

const appendList = async () => {
    await sleep(3000);
    if (client.getCurrent()) {
        for (const url of URLS) {
            let list = await getListAsync(url);
            if (!Array.isArray(list)) {
                continue;
            }
            list.map((item) => item.toString());
            client.getCurrent().appendSpiders(list);
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
