const {
    SLEEP_NORMAL_LOCAL, SLEEP_NORMAL_PROXY, SLEEP_BAN_IP
} = require('./constants');
const { fetchUserInfo, nowStr, sleep } = require('./utils');
const EventEmitter = require('events').EventEmitter;

const SpiderStatus = {
    'FREE': 0,
    'BUSY': 1,
    'BAN': 2
};

const SpiderEvent = {
    'ERROR': Symbol('ERROR'),
    'BAN': Symbol('BAN'),
    'START': Symbol('START'),
    'END': Symbol('END'),
    'TIMEOUT': Symbol('TIMEOUT')
};

class Spider {
    constructor (url) {
        this.url = url;
        this.status = SpiderStatus.FREE;
        this.sleepms =
            this.url === '' ? SLEEP_NORMAL_LOCAL : SLEEP_NORMAL_PROXY;
        this.timeout = 0;
        this.loopCount = 0;
        this.event = new EventEmitter();

        this.event.on(SpiderEvent.ERROR, (spider, mids, mid, msg) => {
            mids.push(mid);
            spider.status = SpiderStatus.FREE;
        });
        this.event.on(SpiderEvent.END, (spider) => {
            spider.status = SpiderStatus.FREE;
            spider.timeout > 0 && spider.timeout--;
            spider.sleepms =
                spider.url === '' ? SLEEP_NORMAL_LOCAL : SLEEP_NORMAL_PROXY;
        });
        this.event.on(SpiderEvent.BAN, (spider) => {
            spider.sleepms = SLEEP_BAN_IP;
            spider.status = SpiderStatus.BAN;
        });
    }

    async crawl (cardList, mids) {
        // 栗子流节流器
        if (this.loopCount++ > 0) {
            await sleep(this.sleepms);
        }
        if (!this.status === SpiderStatus.FREE || mids.length === 0) {
            return;
        }
        this.status = SpiderStatus.BUSY;
        const mid = mids.pop();
        try {
            this.event.emit(SpiderEvent.START, this, mid);
            const rs = await fetchUserInfo(mid, { proxy: this.url });
            if (!rs) {
                this.event.emit(SpiderEvent.ERROR, this, mids, mid, 'Empty response');
                return;
            }
            const data = JSON.parse(rs).data;
            data.card.mid = mid;
            data.card.archive_count = data.archive_count;
            data.card.ctime = nowStr();
            cardList.push(data.card);
            this.event.emit(SpiderEvent.END, this, mid);
        } catch (err) {
            if (err.message && err.message.indexOf('Forbidden') !== -1) {
                // IP进小黑屋了
                mids.push(mid);
                this.event.emit(SpiderEvent.BAN, this, mids, mid, 'Ban IP');
                return;
            }
            this.event.emit(SpiderEvent.ERROR, this, mids, mid, err.message);
            if (err && err.timeout) {
                this.timeout++;
                this.event.emit(SpiderEvent.TIMEOUT, this, mid);
            }
        }
    }
}

module.exports = { Spider, SpiderStatus, SpiderEvent };
