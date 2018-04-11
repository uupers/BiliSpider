const { process } = require('./spider');
const { nowStr, sleep } = require('./utils');

const run = async () => {
    console.log(nowStr(), 'Start to fetch member info.');
    for (;;) {
        try {
            if (await process() === -1) {
                break;
            }
        } catch (err) {
            console.error('很有可能是网络超时了, 10秒后重试', err.message);
            await sleep(10000);
        }
    }
    console.log(nowStr(), 'End fetch.');
};
// start code
run();
