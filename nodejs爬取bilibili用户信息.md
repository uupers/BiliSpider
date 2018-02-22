## nodejs爬取bilibili用户信息

### 准备
我们需要以下工具
- nodejs[http://nodejs.cn/]
- mongodb[https://www.mongodb.com/download-center?jmp=nav#community]

PS: 如果会docker的话，docker中拉一个mongodb的镜像也行，或许还方便点

安装mongodb可以参考： http://blog.csdn.net/qq_33210798/article/details/74332549

安装过程某处左下角会有勾选mongo compass的选项，默认是勾上的，建议不要动。

注意在win7系统上mongo可能会出现mongo campass安装不上的情况（进度条不走，同时无法cancel。已经证实不是个例）。

如果出现这样的情况请通过任务管理器结束程序并结束安装进程。（理论上来说此时mongo本体应该已经安装上了）


### Coding
找一个空文件夹，按住shift点鼠标右键，`在此处打开powershell窗口`(win7系统选择`在此处打开命令窗口`)，输入
```bash
npm install superagent
npm install mongodb
npm install moment
```
在文件夹里新建一个名为 `main.js` 的文件，编辑输入

PS: 当前代码版本已经进行了半自动化处理，无需用户设置mid爬取区间，会自动从0开始爬取数据，并支持断点续爬（你可以随时停下）
```javascript
const superagent = require('superagent');
var moment = require('moment');
moment.locale('zh-cn');
const MongoClient = require('mongodb').MongoClient;
const mongoUrl = "mongodb://localhost:27017";
// 爬取用户信息
const fetchUserInfo = (mid, resolve) => {
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
// 链接mongodb
const connectMongoDBAsync = () => {
    return new Promise((resolve, reject) => MongoClient.connect(mongoUrl, function (err, db) {
        if (err) throw err;
        console.log("数据库已连接! mongoUrl=" + mongoUrl);
        resolve(db)
    }))
}
// 批量插入
const insertListToMongoAsync = (dbo, datalist) => {
    return new Promise((resolve, reject) => {
        dbo.collection("member_info").insertMany(datalist, function (err, res) {
            if (err) throw err;
            resolve(res)
        });
    })
}

const getMaxMidAsync = (dbo) => {
    return new Promise((resolve, reject) => {
        dbo.collection("member_info").find().sort({
            mid: -1
        }).limit(1).toArray(function (err, result) {
            if (err) throw err;
            resolve(result && result[0].mid || 1)
        });
    })
}
// dbo: mongo库操作对象， mids：待处理mid列表，
const packageFetchInsertAsync = async (dbo, mids) => {
    const midSize = mids.length
    let cardList = []
    let loopCount = 0
    while (mids.length > 0) {
        loopCount++
        // 循环两遍未结束，强行退出
        if (loopCount > midSize * 2) break
        try {
            let mid = mids.pop();
            let rs = await fetchUserInfo(mid);
            if (rs) {
                const data = JSON.parse(rs).data;
                data.card.mid = mid;
                data.card.archive_count = data.archive_count;
                cardList.push(data.card);
            } else {
                mids.push(mid)
            }
        } catch (error) {
            mids.push(mid)
            console.error(`mid=${mid}`, error)
        }
        await sleep(60)
    }
    await sleep(1000)
    if (cardList.length === midSize) {
        return await insertListToMongoAsync(dbo, cardList)
    } else {
        console.error(`${nowstr()} failed to fetch info, mids=${mids}`);
        return null
    }
}

const run = async () => {
    const db = await connectMongoDBAsync();
    const dbo = db.db("bilibili_spider")
    console.log(nowstr() + " Start to fetch member info.")

    const maxMid = await getMaxMidAsync(dbo);
    let pid = Math.floor(maxMid / 1000)
    console.log(`${nowstr()} fetch max mid=${maxMid} => pid=${pid}`)
    for (;;) {
        const mids = packageArray(pid)
        console.log(`${nowstr()} To fetch mids [${mids[0]}, ${mids[mids.length-1]}]`);
        const rs = await packageFetchInsertAsync(dbo, mids)
        if (rs == null) break; //写入失败，停止循环
        pid++
    }

    // 关闭数据库
    db.close();
    console.log(nowstr() + ` End fetch.`);
}
// start code
run();
```

### 运行

在刚刚打开的powershell窗口（或命令提示符窗口）中，键入
```
node main
```
如果程序没有报错，就可以在mongodb中欣赏自己的劳动成果了。


