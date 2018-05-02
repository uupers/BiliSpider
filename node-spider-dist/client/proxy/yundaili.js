const rp = require('request-promise');
const cheerio = require('cheerio');
const { sleep } = require('../utils');
const { client } = require('../..');
const schedule = require('node-schedule');

const URLS = [
    'http://www.ip3366.net/free/'
];

const getListAsync = async (url = URLS[0]) => {
    try {
        return await rp({
            uri: url,
            transform: function (body) {
                return cheerio.load(body);
            }
        })
            .then(($) => $('tbody tr'))
            .then((trs) => {
                const list = [ ];
                for (const tr of trs.toArray()) {
                    const tds = cheerio('td', tr);
                    const texts =
                        [3, 0, 1].map((index) => tds.eq(index).text());
                    const url =
                        `${texts[0].toLowerCase()}://${texts[1]}:${texts[2]}`;
                    list.push(url);
                }
                return list;
            });
    } catch (error) {
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
    // get per 30 min
    schedule.scheduleJob('*/30 * * * *', () => {
        appendList();
    });
    await appendList();
};
