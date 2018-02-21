## nodejs爬取bilibili用户信息

### 准备
我们需要以下工具
- nodejs[http://nodejs.cn/]
- mongodb[https://www.mongodb.com/download-center?jmp=nav#community]

PS: 如果会docker的话，docker中拉一个mongodb的镜像也行，或许还方便点

安装mongodb可以参考： http://blog.csdn.net/qq_33210798/article/details/74332549

安装过程某处左下角会有勾选mongo compass的选项，默认是勾上的，建议不要动。 

注意在win7系统上mongo可能会出现mongo campass安装不上的情况（进度条不走，同时无法cancel。已经证实不是个例）。 

如果出现这样的情况请通过任务管理器结束程序并结束安装进程。 （理论上来说此时mongo本体应该已经安装上了）

### Coding
找一个空文件夹，按住shift点鼠标右键，`在此处打开powershell窗口`(win7系统选择`在此处打开命令窗口`)，输入
```bash
npm install superagent
npm install mongodb
npm install moment
```
在文件夹里新建一个名为 `main.js` 的文件，编辑输入
```javascript
const superagent = require('superagent');
var moment = require('moment');
moment.locale('zh-cn');
const MongoClient = require('mongodb').MongoClient;
const mongoUrl = "mongodb://localhost:27017";

const fetchUserInfo = (mid, resolve) => {
    const url = `http://api.bilibili.com/x/web-interface/card?mid=${mid}`;
    return new Promise((resolve, reject) => superagent.get(url).end(function (err, res) {
        resolve(res && res.text)
    }))
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const connectMongoDB = () => {
    return new Promise((resolve, reject) => MongoClient.connect(mongoUrl, function (err, db) {
        if (err) throw err;
        console.log("数据库已连接! mongoUrl=" + mongoUrl);
        resolve(db)
    }))
}
/**
* startMid: 开始爬取的mid
* endMid: 结束爬取的mid (include)
*/
const run = async (startMid, endMid) => {
    const db = await connectMongoDB();
    const dbo = db.db("bilibili_spider")

    console.log("==========Start to fetch member info.")
    const start = process.uptime();
    let cardList = [] // 数据缓存
    let failList = [] // 失败记录缓存
    const step = 1000;
    for (let i = startMid; i <= endMid; i++) {
        let rs = await fetchUserInfo(i);
        try {
            if (rs) {
                const data = JSON.parse(rs).data;
                const card = data.card;
                card.mid = i;
                card.archive_count = data.archive_count;
                cardList.push(card);
            } else {
                failList.push(i)
            }
            if (i % step === 0) {
                dbo.collection("member_info").insertMany(cardList, function (err, res) {
                    if (err) throw err;
                    console.log(`${moment().format('YYYY-MM-DD HH:mm:ss')} Insert index=${i} success=${res.insertedCount} fails=${failList}`);
                    cardList = [] //clear the card list
                    failList = [] //clear the fail list
                });
                await sleep(3000)
            }
        } catch (error) {
            failList.push(i)
            console.error(`mid=${i}`, error)
        }
        await sleep(90)
    }
    // 关闭数据库
    db.close();
    console.log(`========End job, cost ${process.uptime() - start} s`);
}
// 运行入口，自行修改成需要的爬取区间
run(100000,200000);
```

### 运行

在刚刚打开的powershell窗口（或命令提示符窗口）中，键入
```
node main
```
如果程序没有报错，就可以在mongodb中欣赏自己的劳动成果了。


