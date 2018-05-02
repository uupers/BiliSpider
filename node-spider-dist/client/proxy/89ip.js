const rp = require('request-promise');
const cheerio = require('cheerio');
const { sleep } = require('../utils');
const { client } = require('../..');
const schedule = require('node-schedule');

const URLS = [
    'http://www.89ip.cn/tiqv.php?sxb=&tqsl=1000&ports=&ktip=&xl=on&submit=%CC%E1++%C8%A1', // 全国
    'http://www.89ip.cn/tiqv.php?sxb=&tqsl=1000&ports=&ktip=&xl=%B5%E7%D0%C5&submit=%CC%E1++%C8%A1', // 电信
    'http://www.89ip.cn/tiqv.php?sxb=&tqsl=1000&ports=&ktip=&xl=%C1%AA%CD%A8&submit=%CC%E1++%C8%A1', // 联通
    'http://www.89ip.cn/tiqv.php?sxb=&tqsl=1000&ports=&ktip=&xl=%D2%C6%B6%AF&submit=%CC%E1++%C8%A1' // 移动
];

const getListAsync = async (url = URLS[0], index = 0) => {
    try {
        return await rp({
            method: 'GET',
            uri: url,
            timeout: 60 * 1000,
            transform: function (body) {
                return cheerio.load(body);
            }
        })
            .then(($) => $('.mass').html().replace(/\s+/g, ''))
            .then((html) => {
                return html
                    .match(/(\d+\.){3}\d+:\d+(?!:<br>)/gi)
                    .map((item) => item.toString())
                    .map((item) => `http://${item}`);
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
