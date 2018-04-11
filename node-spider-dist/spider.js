/**
 * version:2018-03-03
 * 1. 提升稳定性：爬取用户信息时的异常进行处理
 */
const superagent = require('superagent');

const {
    sleep, getPackageAsync, fetchUserInfo, nowStr, packageArray
} = require('./utils');
const {
    SLEEP_BAN_IP, SLEEP_NORMAL, URL_UPLOAD_PACKAGE
} = require('./constants');

// 上传任务结果
const uploadPackageAsync = (pid, cardList) => {
    const data = {
        pid: pid,
        package: JSON.stringify(cardList)
    };
    return superagent.post(URL_UPLOAD_PACKAGE).type('form').send(data).then();
};

//  mids：待处理mid列表，
const packageFetchInsertAsync = async (pid, mids) => {
    let sleepms = SLEEP_NORMAL;

    const midSize = mids.length;
    let cardList = [ ];
    let loopCount = 0;
    const processings = { }; // 进行中的任务

    const errorHandler = (mid, msg) => {
        mids.push(mid);
        delete processings[mid];
        console.error(`${nowStr()} mid=${mid}`, msg);
    };
    while (mids.length > 0) {
        // 栗子流节流器
        if (loopCount++ > 0) {
            await sleep(sleepms);
        }
        // 循环两遍未结束，强行退出
        if (loopCount > midSize * 2) {
            console.log(`循环次数已到${loopCount}次，结束循环`);
            break;
        }
        let mid = mids.pop();
        processings[mid] = true;
        try {
            const rs = await fetchUserInfo(mid);
            if (!rs) {
                errorHandler('Empty response');
                continue;
            }
            if (rs.indexOf('DOCTYPE html') >= 0) {
                sleepms = SLEEP_BAN_IP; // IP进小黑屋了
                mids.push(mid);
                console.error(`${nowStr()} oops，你的IP进小黑屋了，爬虫程序会在10min后继续`);
                continue;
            }
            const data = JSON.parse(rs).data;
            data.card.mid = mid;
            data.card.archive_count = data.archive_count;
            data.card.ctime = nowStr();
            cardList.push(data.card);
            delete processings[mid];
        } catch (err) {
            errorHandler(mid, err.message);
            continue;
        }

        if (sleepms === SLEEP_BAN_IP) {
            break; // 结束本次任务，尝试下个任务
        }

        if (mids.length === 0) {
            await sleep(7000);
        }
    }
    if (cardList.length === midSize) {
        await uploadPackageAsync(pid, cardList);
        console.log(`${nowStr()} Send package ${pid}`);
    } else {
        console.error(`${nowStr()} Failed to fetch info, ok/all=${cardList.length}/${midSize}, remains=${mids}, processings=${Object.keys(processings)}`);
    }
};

const process = async () => {
    const data = await getPackageAsync();
    const pid = JSON.parse(data).pid;
    if (pid === -1) return pid;

    const mids = packageArray(pid);
    console.log(`${nowStr()} Get package ${pid}, fetch mids [${mids[0]}, ${mids[mids.length - 1]}]`);
    await packageFetchInsertAsync(pid, mids);
};

module.exports = {
    process
};
