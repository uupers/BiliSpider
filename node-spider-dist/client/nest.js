const { Spider, SpiderStatus, SpiderEvent } = require('./spider');
const {
    getPackageAsync, uploadPackageAsync, packageArray, sleep, nowStr, OT
} = require('./utils');
const { ID_RANGE_NUM } = require('./constants');
const lodash = require('lodash');
const EventEmitter = require('events').EventEmitter;
const config = require('y-config');
const Keyv = require('keyv');

const NestEvent = {
    'HEART': Symbol('HEART'),
    'START': Symbol('START'),
    'END': Symbol('END'),
    'SENDING': Symbol('SENDING'),
    'SENDED': Symbol('SENDED'),
    'SENDFAIL': Symbol('SENDFAIL'),
    'VING': Symbol('VING'),
    'VSUCCESS': Symbol('VSUCCESS'),
    'VFAIL': Symbol('VFAIL'),
    'TIMEOUT': Symbol('TIMEOUT'),
    'CATCH': Symbol('CATCH')
};

const TIMEOUT = 1000 * 60 * 60; // 1h

class SpiderNest {
    constructor (list = [ '' ]) {
        this.names = [ ];
        this.nest = [ ];
        this.event = new EventEmitter();
        this.startedAt = 0;
        this.keyv = new Keyv();

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
        this.event.on(NestEvent.CATCH, () => {
            this.startedAt = Date.now();
        });
    }

    appendSpiders (names) {
        const list = [...new Set(names)].filter((v) => {
            return this.names.indexOf(v) === -1;
        });
        this.names.push(...list);
        this.nest.push(...list.map((name) => {
            const spider = new Spider(name);
            const event = spider.event;
            event.on(SpiderEvent.ERROR, (s, mid, msg) => {
                OT.error(`[${nowStr()}][${s.url}] mid=${mid} ${msg}`);
                if (s.errors >= 5) {
                    this.cleanDeadSpider(this.names.indexOf(s.url));
                }
            });
            event.on(SpiderEvent.BAN, (s) => {
                OT.warn(`[${nowStr()}][${s.url}] oops，你的IP进小黑屋了，爬虫程序会在10min后继续`);
            });
            if ((config.args || { }).dev) {
                event.on(SpiderEvent.START, (s, mid) => {
                    OT.log(`[${nowStr()}][${s.url}] mid=${mid} Start`);
                });
                event.on(SpiderEvent.END, (s, mid) => {
                    OT.log(`[${nowStr()}][${s.url}] mid=${mid} Get`);
                });
            }
            return spider;
        }));
        return true;
    }

    async march () {
        this.startedAt = Date.now();
        const data = await getPackageAsync();
        const pid = JSON.parse(data).pid;
        if (pid === -1) return pid;
        this.store = new NestStore(pid);
        this.store.on(StoreEvent.PUSH, (store, mid) => {
            const cardList = store.getList();
            const pid = store.getPid();
            this.event.emit(NestEvent.CATCH, pid, mid, cardList);
        });
        const mids = this.store.getMids();
        this.event.emit(NestEvent.START, pid, mids);
        const that = this;
        for (;;) {
            await sleep(50);
            if (that.startedAt + TIMEOUT <= Date.now()) {
                that.event.emit(NestEvent.TIMEOUT, pid);
                break;
            }
            this.event.emit(NestEvent.HEART, pid, await that.getSpidersInfo());
            if (that.store.getCount() === ID_RANGE_NUM) {
                that.event.emit(NestEvent.END, pid, that.store.getList());
                await that.upload(pid);
                break;
            } else if (that.isHasFree()) {
                let spiders = that.getFreeSpiders();
                spiders = lodash.sampleSize(spiders, spiders.length);
                let cards = that.store.getLoseCards();
                cards = lodash.sampleSize(cards, cards.length);
                const lanuchArr =
                lodash.minBy([spiders, cards], 'length');
                for (let i = 0; i < lanuchArr.length; i++) {
                    const spider = spiders[i];
                    spider.crawl(that.store, cards[i]);
                }
                if (spiders.length <= cards.length) {
                    continue;
                }
                cards = lodash.sampleSize(cards, cards.length);
                for (let i = lanuchArr.length; i < spiders.length; i++) {
                    const spider = spiders[i];
                    spider.crawl(that.store, cards[i]);
                }
            }
        }
    }

    validtion () {
        const pid = this.store.getPid();
        this.event.emit(NestEvent.VING, pid);
        const srcList = this.store.getMids();
        const tarList = this.store.getList()
            .sort((a, b) => {
                return a.mid - b.mid;
            })
            .reduce((arr, item) => {
                arr.push(+item.mid);
                return arr;
            }, [ ]);
        for (let i = 0; i < srcList.length; i++) {
            if (srcList[i] !== tarList[i]) {
                this.event.emit(NestEvent.VFAIL, pid);
                return false;
            }
        }
        this.event.emit(NestEvent.VSUCCESS, pid);
        return true;
    }

    async upload (index = 0) {
        const pid = this.store.getPid();
        if (!this.validtion(pid)) {
            return;
        }
        this.event.emit(NestEvent.SENDING, pid, index);
        return uploadPackageAsync(pid, this.store.getList()).then(() => {
            this.event.emit(NestEvent.SENDED, pid);
        }).catch(() => {
            if (index < 10) {
                return this.upload(++index);
            }
            this.event.emit(NestEvent.SENDFAIL, pid);
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

    getFreeSpiders () {
        return this.nest.filter((s) => {
            return s.status === SpiderStatus.FREE;
        });
    }

    async getSpidersInfo () {
        const KEY = 'info';
        let content = await this.keyv.get(KEY);
        if (content) {
            return content;
        }
        content = {
            active:
                this.nest.filter((s) => s.status !== SpiderStatus.BAN).length,
            ban: this.nest.filter((s) => s.status === SpiderStatus.BAN).length,
            total: this.nest.length
        };
        await this.keyv.set('info', content, 1000); // Cache 1s
        return content;
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

const StoreStatus = {
    'NONE': Symbol('NONE'),
    'EXIST': Symbol('EXIST'),
    'PANDING': Symbol('PANDING')
};

const StoreEvent = {
    'PUSH': Symbol('PUSH')
};

class NestStore extends EventEmitter {
    constructor (pid) {
        super();
        this.pid = pid;
        this.mids = packageArray(pid);
        this.cardList = [ ];
        this.processing = this.mids.reduce((obj, mid) => {
            obj[mid] = StoreStatus.NONE;
            return obj;
        }, { });
    }

    getList () { return this.cardList; }

    getPid () { return this.pid; }

    getMids () { return this.mids; }

    getLoseCards () {
        const diff = [ ];
        for (const k of Object.keys(this.processing)) {
            if (this.processing[k] === StoreStatus.NONE) {
                diff.push(k);
            }
        }
        return diff;
    }

    getCount () {
        return this.cardList.length;
    }

    addCard (mid, card) {
        if (this.processing[mid] !== StoreStatus.NONE) {
            return;
        }
        this.processing[mid] = StoreStatus.PANDING;
        this.cardList.push(card);
        this.processing[mid] = StoreStatus.EXIST;
        this.emit(StoreEvent.PUSH, this, mid);
    }
}

module.exports = { SpiderNest, NestEvent };
