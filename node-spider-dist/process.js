const {
    sleep, nowStr, OT
} = require('./utils');

const { SpiderNest } = require('./nest');

const fns = [ ];

const on = (eventName, fn) => {
    let obj = {
        name: eventName,
        fns: [ ]
    };
    let point = -1;
    for (let i = 0; i < fns.length; i++) {
        const eventObj = fns[i];
        if (eventObj.name === eventName) {
            obj = eventObj;
            point = i;
            break;
        }
    }
    obj.fns.push(fn);
    if (point === -1) {
        fns.push(obj);
    } else {
        fns[point] = obj;
    }
};

let curNest;

const process = (list) => {
    curNest = new SpiderNest(list);
    for (const eventObj of fns) {
        for (const fn of eventObj.fns) {
            curNest.event.on(eventObj.name, fn);
        }
    }
    return curNest.march();
};

const loop = async (list = [ ]) => {
    OT.info(`[${nowStr()}] Start to fetch member info.`);
    for (;;) {
        try {
            const proxyList =
                getCurrent() ? getCurrent().names : [''].concat(list);
            if (await process(proxyList) === -1) {
                break;
            }
        } catch (err) {
            OT.error(`很有可能是网络超时了, 10秒后重试 ${err.message}`);
            await sleep(10000);
        }
    }
    OT.info(`[${nowStr()}] End fetch.`);
};

const getCurrent = () => curNest;

module.exports = {
    process, loop, on, getCurrent
};
