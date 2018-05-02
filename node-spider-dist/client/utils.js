const superagent = require('superagent');
require('superagent-proxy')(superagent);
const moment = require('moment');
moment.locale('zh-cn');

const {
    URL_GET_PACKAGE, URL_USER_INFO, URL_UPLOAD_PACKAGE, ID_RANGE_NUM
} = require('./constants');

/**
 * 休眠函数
 * @param {Number} time 休眠时间(单位毫秒)
 */
const sleep = (time) => {
    return new Promise(resolve => setTimeout(resolve, time));
};

const DEF_HTTP_GET_OPTIONS = {
    query: [ ],
    proxy: ''
};

const httpGetAsync = (url, opts = DEF_HTTP_GET_OPTIONS) => {
    let req = superagent.get(url).timeout(5000);
    if (opts) {
        if (Array.isArray(opts.query) && opts.query.length > 0) {
            for (const q of opts.query) {
                req = req.query(q);
            }
        }
        if (typeof opts.proxy === 'string') {
            if (opts.proxy !== '') {
                req = req.proxy(opts.proxy);
            }
        }
    }

    return req.then((res) => res && res.text);
};

const nowStr = () => moment().format('YYYY-MM-DD HH:mm:ss');

// 区间数组生成 rangeArray(0,4) => [0,1,2,3,4]
const rangeArray = (start, end) => {
    return Array(end - start + 1).fill(0).map((v, i) => i + start);
};

// 按千生成区间数组
const packageArray = (packageId) => {
    const baseNum = packageId * 1000;
    return rangeArray(baseNum + 1, baseNum + ID_RANGE_NUM);
};

/**
 * 获取任务包
 */
const getPackageAsync = () => httpGetAsync(URL_GET_PACKAGE);

// 上传任务结果
const uploadPackageAsync = (pid, cardList) => {
    const data = {
        pid: pid,
        package: JSON.stringify(cardList)
    };
    return superagent.post(URL_UPLOAD_PACKAGE).type('form').send(data).then();
};

/**
 * 爬取用户信息
 */
const fetchUserInfo = (mid, opts = { proxy: '' }) => {
    return httpGetAsync(
        URL_USER_INFO,
        Object.assign({ query: [{ mid }] }, opts)
    );
};

const setMock = (mockModule) => {
    return mockModule(superagent);
};

const OT = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error
};

const setOutput = (obj) => {
    if (!obj) {
        for (const method of Object.keys(OT)) {
            OT[method] = () => { };
        }
        return;
    }
    for (const method of Object.keys(OT)) {
        const fn = obj[method];
        if (fn && typeof fn === 'function') {
            OT[method] = fn;
        }
    }
};

module.exports = {
    sleep,
    httpGetAsync,
    nowStr,
    packageArray,
    getPackageAsync,
    uploadPackageAsync,
    fetchUserInfo,
    setMock,
    setOutput,
    OT
};
