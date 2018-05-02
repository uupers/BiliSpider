const rp = require('request-promise');
const cheerio = require('cheerio');
const { sleep } = require('../utils');
const { client } = require('../..');
const schedule = require('node-schedule');

const URLS = [
    'https://www.kuaidaili.com/free/inha/1/',
    'https://www.kuaidaili.com/free/intr/1/'
];

const getListAsync = async (url = URLS[0]) => {
    try {
        return await rp({
            uri: url,
            transform: function (body) {
                return cheerio.load(body);
            }
        })
            .then(($) => $('.con-body #list tbody tr'))
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
    // get per 5 min
    schedule.scheduleJob('*/5 * * * *', () => {
        appendList();
    });
    await appendList();
};
