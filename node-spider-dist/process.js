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

const process = (list = [ ]) => {
    const nest = new SpiderNest();
    nest.appendSpiders(list);
    for (const eventObj of fns) {
        for (const fn of eventObj.fns) {
            nest.event.on(eventObj.name, fn);
        }
    }
    return nest.march();
};

const loop = async (list = [ ]) => {
    OT.info(`[${nowStr()}] Start to fetch member info.`);
    for (;;) {
        try {
            if (await process(list) === -1) {
                break;
            }
        } catch (err) {
            OT.error(`很有可能是网络超时了, 10秒后重试 ${err.message}`);
            await sleep(10000);
        }
    }
    OT.info(`[${nowStr()}] End fetch.`);
};

module.exports = {
    process, loop, on
};
