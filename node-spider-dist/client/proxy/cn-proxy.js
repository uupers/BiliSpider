const rp = require('request-promise');
const cheerio = require('cheerio');
const { sleep } = require('../utils');
const { client } = require('../..');
const schedule = require('node-schedule');

const URLS = [
    'http://cn-proxy.com/',
    'http://cn-proxy.com/archives/218'
];

// //////////////////////////
//
// 该代理在墙外
//
// //////////////////////////
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
            .then(($) => $('.sortable tbody tr'))
            .then((trs) => {
                const list = [ ];
                for (const tr of trs.toArray()) {
                    const tds = cheerio('td', tr);
                    const texts =
                        [0, 1].map((index) => tds.eq(index).html());
                    const url =
                        `http://${texts[0]}:${texts[1]}`;
                    list.push(url);
                }
                return list;
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
    // get per 10 min
    schedule.scheduleJob('*/10 * * * *', () => {
        appendList();
    });
    await appendList();
};
