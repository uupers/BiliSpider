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
    'END': Symbol('END')
};

class Spider {
    constructor (url) {
        this.url = url;
        this.status = SpiderStatus.FREE;
        this.sleepms =
            this.url === '' ? SLEEP_NORMAL_LOCAL : SLEEP_NORMAL_PROXY;
        this.errors = 0;
        this.loopCount = 0;
        this.event = new EventEmitter();

        this.event.on(SpiderEvent.ERROR, (spider, mids, mid, msg) => {
            mids.push(mid);
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
    }

    async crawl (cardList, mids) {
        if (this.status === SpiderEvent.BUSY) {
            return;
        }
        this.status = SpiderStatus.BUSY;
        // 栗子流节流器
        if (this.loopCount++ > 0) {
            await sleep(this.sleepms);
        }
        if (mids.length === 0) {
            this.status = SpiderStatus.FREE;
            return;
        }
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
            (this.url !== '') && this.errors++;
            this.event.emit(SpiderEvent.ERROR, this, mids, mid, err.message);
        }
    }
}

module.exports = { Spider, SpiderStatus, SpiderEvent };
