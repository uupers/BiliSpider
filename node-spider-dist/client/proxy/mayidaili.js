const rp = require('request-promise');
const cheerio = require('cheerio');
const { sleep } = require('../utils');
const { client } = require('../..');
const schedule = require('node-schedule');

const getUrls = async (index = 0) => {
    try {
        return await rp({
            uri: 'http://www.mayidaili.com/share/',
            transform: function (body) {
                return cheerio.load(body);
            }
        })
            .then(($) => $('a[href^=\'http://www.mayidaili.com/share/view/\']'))
            .then((as) => {
                const list = [ ];
                for (const a of as.toArray()) {
                    list.push(cheerio(a).attr('href'));
                }
                return [...new Set(list)];
            });
    } catch (error) {
        if (index < 10) {
            return getUrls(++index);
        }
        console.log(error);
        return [ ];
    }
};

const getListAsync = async (url) => {
    try {
        return await rp({
            uri: url,
            transform: function (body) {
                return cheerio.load(body);
            }
        })
            .then(($) => $('.container p'))
            .then((p) => {
                return p.text()
                    .match(/(\d+\.){3}\d+:\d+/gi)
                    .map((item) => item.toString())
                    .map((item) => `http://${item}`);
            });
    } catch (error) {
        return [ ];
    }
};

const appendList = async () => {
    await sleep(3000);
    if (client.getCurrent()) {
        const urls = await getUrls();
        for (const url of urls) {
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
    // get per 8 hour
    schedule.scheduleJob('* */8 * * *', () => {
        appendList();
    });
    await appendList();
};
