const {
    SLEEP_NORMAL_LOCAL, SLEEP_NORMAL_PROXY, SLEEP_BAN_IP, ID_RANGE_NUM
} = require('./constants');
const { fetchUserInfo, nowStr } = require('./utils');
const EventEmitter = require('events').EventEmitter;

const SpiderStatus = {
    'FREE': Symbol('FREE'),
    'BUSY': Symbol('BUSY'),
    'BAN': Symbol('BAN')
};

const SpiderEvent = {
    /**
     * (spider, mid, msg)
     */
    'ERROR': Symbol('ERROR'),
    /**
     * (spider, mid, msg)
     */
    'BAN': Symbol('BAN'),
    /**
     * (spider, mid)
     */
    'START': Symbol('START'),
    /**
     * (spider, mid)
     */
    'END': Symbol('END')
};

class Spider {
    constructor (url) {
        this.url = url;
        this.status = SpiderStatus.FREE;
        this.sleepms =
            this.url === '' ? SLEEP_NORMAL_LOCAL : SLEEP_NORMAL_PROXY;
        this.errors = 0;
        this.runnedAt = Date.now();
        this.event = new EventEmitter();

        this.event.on(SpiderEvent.ERROR, (spider, mids, mid, msg) => {
            spider.errors++;
            spider.status = SpiderStatus.FREE;
        });
        this.event.on(SpiderEvent.END, (spider) => {
            spider.status = SpiderStatus.FREE;
            spider.errors > 0 && spider.errors--;
            spider.sleepms =
                spider.url === '' ? SLEEP_NORMAL_LOCAL : SLEEP_NORMAL_PROXY;
        });
        this.event.on(SpiderEvent.BAN, (spider) => {
            spider.sleepms = SLEEP_BAN_IP;
            spider.status = SpiderStatus.BAN;
        });
        this.event.on(SpiderEvent.START, (spider) => {
            spider.runnedAt = Date.now();
        });
    }

    async crawl (store, mid) {
        if (this.runnedAt + this.sleepms > Date.now()) {
            return;
        }
        if (store.getCount() >= ID_RANGE_NUM) {
            return;
        }
        if (this.status === SpiderStatus.BUSY) {
            return;
        }
        this.status = SpiderStatus.BUSY;
        try {
            this.event.emit(SpiderEvent.START, this, mid);
            const rs = await fetchUserInfo(mid, { proxy: this.url });
            if (!rs) {
                this.event.emit(SpiderEvent.ERROR, this, mid, 'Empty response');
                return;
            }
            const data = JSON.parse(rs).data;
            data.card.mid = +mid;
            data.card.archive_count = data.archive_count;
            data.card.ctime = nowStr();
            store.addCard(mid, data.card);
            this.event.emit(SpiderEvent.END, this, mid);
        } catch (err) {
            if (err.message && err.message.indexOf('Forbidden') !== -1) {
                // IP进小黑屋了
                this.event.emit(SpiderEvent.BAN, this, mid, 'Ban IP');
                return;
            }
            this.event.emit(SpiderEvent.ERROR, this, mid, err.message);
        }
    }
}

module.exports = { Spider, SpiderStatus, SpiderEvent };
