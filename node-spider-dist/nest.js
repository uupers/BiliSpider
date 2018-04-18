const { Spider, SpiderStatus } = require('./spider');
const {
    getPackageAsync, uploadPackageAsync, packageArray, sleep, nowStr, OT
} = require('./utils');
const lodash = require('lodash');
const EventEmitter = require('events').EventEmitter;

class SpiderNest {
    constructor () {
        this.names = [ ];
        this.nest = [ ];
        this.cardList = [ ];
        this.pid = 0;
        this.processed = false;
        this.event = new EventEmitter();

        this.appendSpiders([ '' ]); // 将本机加进去
        this.event.on('Start', (pid, mids) => {
            OT.info(`[${nowStr()}] Get package ${pid}, fetch mids [${mids[0]}, ${mids[mids.length - 1]}]`);
        });
        this.event.on('Sending', (pid) => {
            OT.log(`[${nowStr()}] Sending package ${pid}`);
        });
        this.event.on('Sended', (pid) => {
            OT.log(`[${nowStr()}] Sended package ${pid}`);
        });
    }

    appendSpiders (names) {
        this.names.push(...names);
        this.nest.push(...[...names].map((name) => {
            const spider = new Spider(name);
            const event = spider.event;
            event.on('error', (s, _, mid, msg) => {
                OT.error(`[${nowStr()}][${s.url}] mid=${mid} ${msg}`);
            });
            event.on('ban', (s) => {
                OT.warn(`[${nowStr()}][${s.url}] oops，你的IP进小黑屋了，爬虫程序会在10min后继续`);
            });
            event.addListener('timeout', (s) => {
                if (s.timeout > 10) {
                    this.cleanDeadSpider(this.names.indexOf(s.url));
                }
            });
            event.on('Start', (s, mid) => {
                OT.log(`[${nowStr()}][${s.url}] mid=${mid} Statr`);
            });
            event.on('End', (s, mid) => {
                OT.log(`[${nowStr()}][${s.url}] mid=${mid} Get`);
            });
            return spider;
        }));
        return true;
    }

    async march () {
        const data = await getPackageAsync();
        const pid = JSON.parse(data).pid;
        if (pid === -1) return pid;
        const mids = packageArray(pid);
        this.event.emit('Start', pid, mids);
        const lanuchArr = lodash.minBy([mids, this.nest], 'length');
        for (let i = 0; i < lanuchArr.length; i++) {
            const spider = this.nest[i];
            spider.event.on('End', (s, mid) => {
                this.event.emit('Catch', s, pid, mid);
            });
            spider.event.addListener('End', () => {
                if (mids.length !== 0 && this.isHasFree()) {
                    this.randomSpider().crawl(this.cardList, mids);
                    return;
                }
                if (this.processed) {
                    return;
                }
                if (mids.length === 0 && !this.isHasBusy()) {
                    this.processed = true;
                }
            });
            spider.event.addListener('error', () => {
                if (this.isHasFree()) {
                    this.randomSpider().crawl(this.cardList, mids);
                }
            });
            spider.crawl(this.cardList, mids);
        }
        for (;;) {
            await sleep(1000);
            if (this.processed) {
                await this.upload(pid);
                break;
            }
        }
    }

    upload (pid) {
        this.event.emit('Sending', pid);
        return uploadPackageAsync(pid, this.cardList).then(() => {
            this.event.emit('Sended', pid);
        }).catch(async () => {
            return this.upload(pid);
        });
    }

    isHasFree () {
        for (const spider of this.nest) {
            if (spider.status === SpiderStatus.FREE) {
                return true;
            }
        }
        return false;
    }

    isHasBusy () {
        for (const spider of this.nest) {
            if (spider.status === SpiderStatus.BUSY) {
                return true;
            }
        }
        return false;
    }

    randomSpider () {
        if (!this.isHasFree()) {
            return null;
        }
        const s = lodash.sample(this.nest);
        return s.status === SpiderStatus.FREE ? s : this.randomSpider();
    }

    cleanDeadSpider (point) {
        this.names.splice(point, 1);
        this.nest.splice(point, 1);
    }
}

module.exports = { SpiderNest };
