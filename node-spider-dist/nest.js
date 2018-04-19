const { Spider, SpiderStatus, SpiderEvent } = require('./spider');
const {
    getPackageAsync, uploadPackageAsync, packageArray, sleep, nowStr, OT
} = require('./utils');
const lodash = require('lodash');
const EventEmitter = require('events').EventEmitter;

const NestEvent = {
    'START': Symbol('START'),
    'END': Symbol('END'),
    'SENDING': Symbol('SENDING'),
    'SENDED': Symbol('SENDED'),
    'CATCH': Symbol('CATCH')
};

const TIMEOUT = 1000 * 60 * 20; // 20 min

class SpiderNest {
    constructor (list = [ '' ]) {
        this.names = [ ];
        this.nest = [ ];
        this.cardList = [ ];
        this.pid = 0;
        this.processed = false;
        this.event = new EventEmitter();
        this.startedAt = 0;

        this.appendSpiders(list);
        this.event.on(NestEvent.START, (pid, mids) => {
            OT.info(`[${nowStr()}] Get package ${pid}, fetch mids [${mids[0]}, ${mids[mids.length - 1]}]`);
        });
        this.event.on(NestEvent.SENDING, (pid) => {
            OT.log(`[${nowStr()}] Sending package ${pid}`);
        });
        this.event.on(NestEvent.SENDED, (pid) => {
            OT.log(`[${nowStr()}] Sended package ${pid}`);
        });
        this.event.on(NestEvent.END, () => {
            this.processed = true;
        });
    }

    appendSpiders (names) {
        this.names.push(...names);
        this.nest.push(...[...names].map((name) => {
            const spider = new Spider(name);
            const event = spider.event;
            event.on(SpiderEvent.ERROR, (s, _, mid, msg) => {
                OT.error(`[${nowStr()}][${s.url}] mid=${mid} ${msg}`);
                if (s.errors >= 5) {
                    this.cleanDeadSpider(this.names.indexOf(s.url));
                }
            });
            event.on(SpiderEvent.BAN, (s) => {
                OT.warn(`[${nowStr()}][${s.url}] oops，你的IP进小黑屋了，爬虫程序会在10min后继续`);
            });
            return spider;
        }));
        return true;
    }

    async march () {
        this.startedAt = Date.now();
        const data = await getPackageAsync();
        const pid = JSON.parse(data).pid;
        if (pid === -1) return pid;
        const mids = packageArray(pid);
        this.event.emit(NestEvent.START, pid, mids);
        const lanuchArr = lodash.minBy([mids, this.nest], 'length');
        for (let i = 0; i < lanuchArr.length; i++) {
            const spider = this.nest[i];
            const that = this;
            spider.event.on(SpiderEvent.END, (s, mid) => {
                that.event.emit(NestEvent.CATCH, s, pid, mid, that.cardList);
            });
            spider.event.addListener(SpiderEvent.END, () => {
                if (that.processed) {
                    return;
                }
                if (mids.length === 0 && !that.isHasBusy()) {
                    that.event.emit(NestEvent.END, pid, that.cardList);
                }
            });
            spider.event.on(SpiderEvent.BAN, (s) => {
                s.crawl(that.cardList, mids);
            });
        }
        for (;;) {
            await sleep(100);
            if (this.startedAt + TIMEOUT <= Date.now()) {
                break;
            }
            if (this.cardList.length === 1000 || this.processed) {
                this.event.emit(NestEvent.END, pid, this.cardList);
                await this.upload(pid);
                break;
            } else if (this.isHasFree()) {
                let spiders = this.getFree();
                spiders = lodash.sampleSize(spiders, spiders.length);
                const lanuchArr = lodash.minBy([mids, spiders], 'length');
                for (let i = 0; i < lanuchArr.length; i++) {
                    const spider = spiders[i];
                    spider.crawl(this.cardList, mids);
                }
            }
        }
    }

    upload (pid) {
        this.event.emit(NestEvent.SENDING, pid);
        return uploadPackageAsync(pid, this.cardList).then(() => {
            this.event.emit(NestEvent.SENDED, pid);
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

    getFree () {
        return this.nest.filter((s) => {
            return s.status === SpiderStatus.FREE;
        });
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

module.exports = { SpiderNest, NestEvent };
