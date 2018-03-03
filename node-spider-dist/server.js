const moment = require('moment');
moment.locale('zh-cn');
const nowstr = () => moment().format('YYYY-MM-DD HH:mm:ss')
const express = require('express');
const app = express();
const bodyParser = require('body-parser')
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

//=======mongodb=======
const MongoClient = require('mongodb').MongoClient;
const mongoUrl = "mongodb://localhost/bilibili_spider";
// 链接mongodb
const connectMongoDBAsync = () => {
    return new Promise((resolve, reject) => MongoClient.connect(mongoUrl, function (err, db) {
        if (err) throw err;
        console.log(`${nowstr()} 数据库已连接! mongoUrl=${mongoUrl}`);
        resolve(db)
    }))
}
let dbo = null;
connectMongoDBAsync().then((db) => dbo = db.db('bilibili_spider'));

// 批量插入
const insertListToMongoAsync = (datalist) => {
    return new Promise((resolve, reject) => {
        if (datalist == null || datalist.length == 0) {
            console.log(`${nowstr()} empty datalist`)
            resolve(null)
            return
        }
        dbo.collection("member_card").insertMany(datalist, function (err, res) {
            if (err) reject(err);
            resolve(res)
        });
    })
}

//=======Redis=======
const redis = require('redis');
const redisClient = redis.createClient('6379', '127.0.0.1');
// redis 链接错误
redisClient.on("error", error => console.error(nowstr(), error))
const redisWaitListKey = "bilibili:package:wait"
const redisDoneListKey = "bilibili:package:done"
const redisProcessHash = "bilibili:package:process"

const pushWaitList = (pid) => redisClient.lpush(redisWaitListKey, pid);
const popWaitListAsync = () => {
    return new Promise((resolve, reject) => {
        redisClient.brpop(redisWaitListKey, 20, (err, res) => resolve(res && res[1]))
    })
}
const pushDoneSet = (pid) => redisClient.sadd(redisDoneListKey, pid)
const checkPidInHash = (pid, cb) => redisClient.hexists(redisProcessHash, pid, cb)
const setProcessHash = (pid, value) => redisClient.hset(redisProcessHash, pid, value)
const removeProcessHash = (pid) => redisClient.hdel(redisProcessHash, pid)
const getProcessHashAsync = (pid) => {
    return new Promise((resolve, reject) => {
        redisClient.hset(redisProcessHash, pid, (err, res) => resolve(res))
    })
}
const moveExpiredHashItem = (cb) => {
    redisClient.hgetall(redisProcessHash, (err, allItem) => {
        if(allItem){
            Object.keys(allItem).forEach(pid =>{
                const ctime = moment(JSON.parse(allItem[pid]).ctime)
                // 超过30分钟的任务做超时处理
                if(ctime.add(30, 'minutes').isBefore(moment())){
                    pushWaitList(pid)
                    removeProcessHash(pid)
                    console.log(`${nowstr()} expire pid ${pid}`)
                }
            })
        }
    })
}

//===========Web======
app.get('/initRedis', function (req, res) {
    redisClient.llen(redisWaitListKey, function (err, rs) {
        const ret = {}
        ret.success = true
        if (rs == 0) {
            for (let i = 1; i <= 300000; i++) {
                pushWaitList(i)
            }
            ret.message = '30 0000 pids'
        } else {
            ret.message = 'do nothing'
        }
        res.send(ret);
    })
})

app.get('/getPackage', function (req, res) {
    moveExpiredHashItem()
    popWaitListAsync().then((pid) => {
        if (pid) {
            const jsonValue = JSON.stringify({
                ctime: nowstr()
            })
            setProcessHash(pid, jsonValue)
            const ret = {}
            ret.success = true
            ret.pid = pid * 1
            res.send(ret);
        } else {
            const ret = {}
            ret.success = false
            ret.pid = -1
            res.send(ret);
        }
    })
})

app.post('/uploadPackage', function (req, res) {
    const pid = req.body['pid']
    const package = req.body['package']
    if (package == null || package == '') {
        res.send({
            pid: pid,
            success: false,
            message: 'empty package'
        });
        console.log(`${nowstr()} empty package, pid=${pid}`)
        return
    }
    const cardList = JSON.parse(package)

    insertListToMongoAsync(cardList).then((res) => {
        checkPidInHash(pid, (err, exist) => {
            if (exist) { // 校验hash中是否存在对应的field
                removeProcessHash(pid)
                if (res) {
                    pushDoneSet(pid)
                } else {
                    pushWaitList(pid)
                }
            } else {
                console.log(`${nowstr()} the pid not in hash, pid=${pid}`)
            }
        })

        const str = res ? 'Seccess' : 'Failed'
        console.log(`${nowstr()} ${str} to insert a package, pid=${pid}`)
    })
    const ret = {
        pid: pid,
        success: true,
        message: 'ok'
    }
    res.send(ret);
})

app.get('/', function (req, res) {
    res.send('Hello World');
})

const port = 16123;
var server = app.listen(port, function () {

    var host = server.address().address
    var port = server.address().port

    console.log("Express，访问地址为 http://%s:%s", host, port)

})
