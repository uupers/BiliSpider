const rp = require('request-promise');
const cheerio = require('cheerio');
const { sleep } = require('../utils');
const { client } = require('../..');
const schedule = require('node-schedule');

const URLS = [
    'http://www.xicidaili.com/',
    'http://www.xicidaili.com/nn/',
    'http://www.xicidaili.com/nt/',
    'http://www.xicidaili.com/wn/',
    'http://www.xicidaili.com/wt/'
];

const getListAsync = async (url = URLS[0]) => {
    try {
        return await rp({
            uri: url,
            transform: function (body) {
                return cheerio.load(body);
            }
        })
            .then(($) => $('tr:has(td.country)'))
            .then((trs) => {
                const list = [ ];
                for (const tr of trs.toArray()) {
                    const tds = cheerio('td', tr);
                    if (!/http/i.test(tds.eq(5).text())) {
                        continue;
                    }
                    const texts =
                        [5, 1, 2].map((index) => tds.eq(index).text());
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
