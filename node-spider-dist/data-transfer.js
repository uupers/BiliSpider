const moment = require('moment');
moment.locale('zh-cn');
const nowstr = () => moment().format('YYYY-MM-DD HH:mm:ss')
// 休眠函数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const mongojs = require('mongojs')
// 本地库和远程库测试地址
const localdb = mongojs('bilibili_spider', ['member_comp'])
const remotedb = mongojs('bilibili_spider', ['member_card'])
// 数据裁剪
const reduce = (doc) => {
    let {
        _id, //不需要
        approve, //空值
        sex, //男-0，女-1，保密-2
        face, // 去掉前缀
        DisplayRank, //不需要
        rank, //不需要
        article, //空值
        regtime, //空值
        spacesta, //空值
        birthday, //空值
        place, //空值
        description, //空值
        attentions, //toString
        attention, //不需要
        level_info, //仅保留经验值 => levelExp 
        pendant, //不需要
        nameplate, //不需要
        official_verify, //
        vip, //
        ctime,
        ...rest
    } = doc;
    const sexMap = {
        '男': 0,
        '女': 1,
        '保密': 2
    }
    rest.sex = sexMap[sex];
    rest.face = face && face.split('face/').length == 2 && face.split('face/')[1] || ''
    rest.attentions = attentions + ''
    rest.exp = level_info && level_info.current_exp
    return rest
}
// 获取远程库中最小的MID
const fetchMinMidAsync = async () => {
    return new Promise((resolve, reject) => remotedb.member_card.find().sort({
        mid: 1
    }).limit(1, (err, docs) => err ? reject(err) : resolve(docs && docs.length > 0 && docs[0].mid || -1)))
}

const fetchDocsAsync = async (startMid, size) => {
    return new Promise((resolve, reject) => remotedb.member_card.find({
        mid: {
            $gte: startMid
        }
    }).sort({
        mid: 1
    }).limit(size, (err, docs) => err ? reject(err) : resolve(docs)))
}

const saveToLocal = async (docs) => {
    return new Promise((resolve, reject) => localdb.member_comp.insert(docs, {
        writeConcern: {
            w: 0 //忽略写入异常
        }
    }, (err, res) => err ? reject(err) : resolve(res && res.length)))
}

const removeFromRemote = async mids => {
    return new Promise((resolve, reject) => remotedb.member_card.remove({
        mid: {
            $gte: mids[0],
            $lte: mids[mids.length - 1]
        }
    }, (err, res) => err ? reject(err) : resolve(res)))
}
// retry 重试次数
const fetchAndSaveAndRemove = async (startMid, size, loopId, retry = 5) => {
    // 记录步骤，方便报错的时候查看出错的位置
    const states = [`retry=${retry}`]
    try {
        const docs = await fetchDocsAsync(startMid, size)
        states.push(`fetch`)
        console.log(`${nowstr()} #${loopId} docs length=${docs.length}`)
        if (!docs || docs.length === 0) return
        const shrinkDocs = docs.map(v => reduce(v))
        await saveToLocal(shrinkDocs)
        states.push(`save`)

        const mids = shrinkDocs.map(v => v.mid)
        await removeFromRemote(mids)
        states.push(`remove`)
        return loopId
    } catch (err) {
        console.error(`${nowstr()} #${loopId} [${states}] ${err.stack}`)
        if (retry > 0) {
            // retry the task
            return fetchAndSaveAndRemove(startMid, size, loopId, retry - 1)
        }
    }
    return loopId * -1
}

const run = async () => {
    console.log(`${nowstr()} ========== job started.`)
    let startMid = await fetchMinMidAsync()
    if(startMid == -1) return -1;
    console.log(`${nowstr()} start mid=${startMid}`)
    const total = 400
    const step = 25
    let fins = 0

    for (let i = 0; i < total; i++) {
        console.log(`${nowstr()} loopId=${i}, start mid=${startMid}, size=${step}`)
        fetchAndSaveAndRemove(startMid, step, i).then((loopId) => {
            console.log(`${nowstr()} #${loopId} finished, fins/total=${++fins}/${total}`)
        })
        startMid += step
        await sleep(300)
    }

    console.log(`${nowstr()} ========== Wait for sub processing.`)
    while (fins < total) {
        await sleep(1000)
    }
    console.log(`${nowstr()} ========== job end.`)
    return 0
}

(async () => {
    for (let i = 0;; i++) {
        console.log(`${nowstr()} ========== BIG LOOP ${i}`)
        const code = await run()
        if(code == -1) break
    }
    localdb.close()
    remotedb.close()
    console.log(`${nowstr()} the mongo connection closed.`)
})()
