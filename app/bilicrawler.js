const loghtml = document.getElementById('log-process')

///////////////////
// For Kernel
///////////////////

/**
 * version:2018-03-03
 * 1. 提升稳定性：爬取用户信息时的异常进行处理
 */
const superagent = require('superagent');
var moment = require('moment');
moment.locale('zh-cn');
const httpGetAsync = url => new Promise((resolve, reject) => superagent.get(url).end((err, res) => err ? reject(err) : resolve(res && res.text)))
// 获取任务包
const getPackageAsync = () => httpGetAsync(`http://45.32.68.44:16123/getPackage`)
// 上传任务结果
const uploadPackageAsync = (pid, cardList) => {
    const url = `http://45.32.68.44:16123/uploadPackage`;
    const data = {
        pid: pid,
        package: JSON.stringify(cardList)
    }
    return new Promise((resolve, reject) => superagent.post(url).type('form').send(data).end((err, res) => err ? reject(err) : resolve(res && res.text)))
}
// 爬取用户信息
const fetchUserInfo = mid => httpGetAsync(`http://api.bilibili.com/x/web-interface/card?mid=${mid}`)

// 休眠函数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
// 区间数组生成 rangeArray(0,4) => [0,1,2,3,4]
const rangeArray = (start, end) => Array(end - start + 1).fill(0).map((v, i) => i + start)
// 按千生成区间数组
const packageArray = packageId => rangeArray(packageId * 1000 + 1, (packageId + 1) * 1000)
const nowstr = () => moment().format('YYYY-MM-DD HH:mm:ss')
//  mids：待处理mid列表，
const packageFetchInsertAsync = async (pid, mids) => {
    const BAN_IP_SLEEP_MS = 1000 * 60 * 10; // 10min
    const NORMAL_SLEEP_MS = 150; //ms
    let sleepms = NORMAL_SLEEP_MS

    const midSize = mids.length
    let cardList = []
    let loopCount = 0
    const processings = {} //进行中的任务
    while (mids.length > 0) {
        loopCount++
        // 循环两遍未结束，强行退出
        if (loopCount > midSize * 2) break
        let mid = mids.pop();
        processings[mid] = true
        fetchUserInfo(mid).then(rs => {
            if (rs) {
                if (rs.indexOf('DOCTYPE html') >= 0) {
                    sleepms = BAN_IP_SLEEP_MS //IP进小黑屋了
                    mids.push(mid)
                    console.error(`${nowstr()} oops，你的IP进小黑屋了，爬虫程序会在10min后继续`)
                    return
                }
                const data = JSON.parse(rs).data;
                data.card.mid = mid;
                data.card.archive_count = data.archive_count;
                data.card.ctime = nowstr()
                cardList.push(data.card);
            } else {
                mids.push(mid)
            }
        }).catch(err => {
            mids.push(mid)
            // console.error(`${nowstr()} mid=${mid}`, err)
        });
        // 这里多使用一个变量，防止在sleep过程中sleepms值发生改变
        const trueSleepTime = sleepms
        await sleep(trueSleepTime)
        if (trueSleepTime === BAN_IP_SLEEP_MS) {
            break // 结束本次任务，尝试下个任务
        }

        delete processings[mid]
        if(mids.length === 0){
            await sleep(7000)
        }
    }
    if (cardList.length === midSize) {
        await uploadPackageAsync(pid, cardList)
        console.log(`${nowstr()} Send package ${pid}`);
        logit(`${nowstr()} Send package ${pid}`);
    } else {
        console.error(`${nowstr()} failed to fetch info，ok/all=${cardList.length}/${midSize}, mids=${mids}, processings=${Object.keys(processings)}`);
    }
}

const run = async () => {
    console.log(nowstr() + " Start to fetch member info.")
    logit(nowstr() + " Start to fetch member info.")
    for (;;) {
        try{
            const data = await getPackageAsync();
            const pid = JSON.parse(data).pid;
            if (pid == -1) break
    
            const mids = packageArray(pid)
            console.log(`${nowstr()} Get package ${pid}, fetch mids [${mids[0]}, ${mids[mids.length-1]}]`);
            logit(`${nowstr()} Get package ${pid}, fetch mids [${mids[0]}, ${mids[mids.length-1]}]`);
            await packageFetchInsertAsync(pid, mids)
        }
        catch(err){
            console.error("很有可能是网络超时了, 10秒后重试", err)
            await sleep(10000);
        }
    }
    console.log(nowstr() + ` End fetch.`);
    logit(nowstr() + ` End fetch.`);
}
// start code
// run();



///////////////////
// For Electron
///////////////////

// Define function that export result to html tag
function logit(elem) {
    loghtml.insertAdjacentHTML("afterbegin",elem + "<br>")
}


function clickDisable(){
    document.querySelector('#btn-run').disabled = true;
    // alert("Button has been disabled.");
}
function clickChange()  {
    var text = document.querySelector('#btn-run').firstChild;
    text.data = text.data == "已经在爬数据了" ? "贡献你的计算力" : "已经在爬数据了";
 }


// Function used to run test click
function runTest() {
    logit("Clicked")
}

function caction (){
    run();
    clickDisable();
    clickChange();
}

// link button action to function
document.querySelector('#btn-run').addEventListener('click', caction)
