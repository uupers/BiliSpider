## 基于nodejs的分布式爬虫客户端使用

### 准备

代码的运行需要 nodejs ，没有的可到 [官网](http://nodejs.cn/download/) 下载安装

### Coding
1. 找一个空文件夹，按住 `shift` 点鼠标右键，`在此处打开 cmd/powershell 命令窗口`
1. Win7 可能没有这种快捷方式，按 Win+R `cmd` 然后手动 `cd` 过去也是一样的
1. 如果你想手动添加这个快捷方式，可以去看 <a href="https://github.com/Hansimov">IAsimov</a> 写的[教程](https://hansimov.github.io/#%E5%9C%A8%E5%8F%B3%E9%94%AE%E4%B8%AD%E5%8A%A0%E5%85%A5%EF%BC%9A%E6%AD%A4%E5%A4%84%E6%89%93%E5%BC%80%20PowerShell)

然后在命令窗口输入
```bash
npm install superagent
npm install moment
```
出现这个就表示安装成功（Warning 可以无视）

<img width="350" src="https://user-images.githubusercontent.com/6371171/36567207-a9797b9c-181d-11e8-822c-fe9acacc1cde.png">

在文件夹里新建一个名为 `main.js` 的文件，编辑输入
```javascript
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
    await sleep(12000)
    if (cardList.length === midSize) {
        await uploadPackageAsync(pid, cardList)
        console.log(`${nowstr()} Send package ${pid}`);
    } else {
        console.error(`${nowstr()} failed to fetch info, mids=${mids}`);
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
        await packageFetchInsertAsync(pid, mids)
    }
    console.log(nowstr() + ` End fetch.`);
}
// start code
run();
```

### 运行

在刚刚打开的 cmd/powershell 窗口中，键入
```
node main
```
- 如果程序显示 `Start to fetch member info.` ，说明程序正常运行
- 如果程序报 `SyntaxError XX`，可能是 nodejs 版本太旧，请到 [官网](http://nodejs.cn/download/) 下载最新版安装

然后，如果程序报 `Unhandled promise rejection` 等等，请尝试访问 `45.32.68.44:16123` 看能否看到 `Hello World`，如果不能就 GG，可能是你所在的网络有端口访问限制（校园网之类的）

- 如果程序显示 `Get package XX, fetch mids [XX001, XY000]` ，说明在正常爬取了

- 如果程序每隔一段时间显示 `Send package XX` 然后继续领新的任务，说明爬虫正顺利地自动化工作ing～


数据存放在 `栗子球` 的 VPS 服务器上，想欣赏自己的劳动成果的话，可使用任意mongo客户端连接

```
mongodb://spiderrd:spiderrd@45.32.68.44:37017/bilibili_spider
```

这个账号是只读权限的，需要写权限账号的话，可以向 `栗子球` 同学要

