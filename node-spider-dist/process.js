const {
    sleep, nowStr, OT
} = require('./utils');

const { SpiderNest } = require('./nest');

const process = (list = [ ]) => {
    const nest = new SpiderNest();
    nest.appendSpiders(list);
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
    process, loop
};
