const loghtml = document.getElementById('log-process')

///////////////////
// For Kernel
///////////////////

//version 20180225-1
const superagent = require('superagent');
var moment = require('moment');
moment.locale('zh-cn');

const getPackageAsync = () => {
    const url = `http://45.32.68.44:16123/getPackage`;
    return new Promise((resolve, reject) => {
        superagent.get(url).end((err, res) => {
            if (err) reject(err)
            resolve(res && res.text)
        })
    })
}
const uploadPackageAsync = (pid, cardList) => {
    const url = `http://45.32.68.44:16123/uploadPackage`;
    const data = {
        pid: pid,
        package: JSON.stringify(cardList)
    }
    return new Promise((resolve, reject) => superagent.post(url).type('form').send(data).timeout(3000).end((err, res) => resolve(res && res.text)))
}
// 爬取用户信息
const fetchUserInfo = (mid) => {
    const url = `http://api.bilibili.com/x/web-interface/card?mid=${mid}`;
    return new Promise((resolve, reject) => superagent.get(url).end((err, res) => resolve(res && res.text)))
}
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
    while (mids.length > 0) {
        loopCount++
        // 循环两遍未结束，强行退出
        if (loopCount > midSize * 2) break
        let mid = mids.pop();
        fetchUserInfo(mid).then(rs => {
            if (rs) {
                if (rs.indexOf('DOCTYPE html') >= 0) {
                    sleepms = BAN_IP_SLEEP_MS //IP进小黑屋了
                    mids.push(mid)
                    console.error(`${nowstr()} oops，你的IP进小黑屋了，爬虫程序会在半小时后继续`)
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
            console.error(`${nowstr()} mid=${mid}`, err)
        });
        // 这里多使用一个变量，防止在sleep过程中sleepms值发生改变
        const trueSleepTime = sleepms
        await sleep(trueSleepTime)
        if (trueSleepTime === BAN_IP_SLEEP_MS){
            break // 结束本次任务，尝试下个任务
        }
    }
    await sleep(10000)
    if (cardList.length === midSize) {
        await uploadPackageAsync(pid, cardList)
        console.log(`${nowstr()} Send package ${pid}`);
    } else {
        console.error(`${nowstr()} failed to fetch info，finished/all=${cardList.length}/${midSize}, mids=${mids}`);
        logit(`${nowstr()} failed to fetch info，finished/all=${cardList.length}/${midSize}, mids=${mids}`); 
    }
}

const run = async () => {
    console.log(nowstr() + " Start to fetch member info.")
    for (;;) {
        const data = await getPackageAsync();
        const pid = JSON.parse(data).pid;
        if (pid == -1) break

        const mids = packageArray(pid)
        console.log(`${nowstr()} Get package ${pid}, fetch mids [${mids[0]}, ${mids[mids.length-1]}]`);
        
        logit(`${nowstr()} Get package ${pid}, fetch mids [${mids[0]}, ${mids[mids.length-1]}]`); 

        await packageFetchInsertAsync(pid, mids)
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
