import test from 'ava';

const {
    URL_GET_PACKAGE, URL_USER_INFO, URL_UPLOAD_PACKAGE, SLEEP_NORMAL_LOCAL
} = require('../client/constants');
const { setMock } = require('../client/utils');
const mock = setMock(require('superagent-mocker'));
const { client } = require('..');
const lodash = require('lodash');

mock.get(URL_GET_PACKAGE, (req) => {
    const body = { 'success': true, 'pid': 1234 };
    return {
        body, text: JSON.stringify(body)
    };
});

mock.timeout = () => lodash.sample([20, 35, 50]);

mock.get(URL_USER_INFO, (req) => {
    const body = require('./user-info.json');
    body.data.card.mid = req.query.mid;
    return {
        body, text: JSON.stringify(body)
    };
});

client.setOutput();

test.serial('Default', async (t) => {
    let startTime;
    mock.post(URL_UPLOAD_PACKAGE, (req) => {
        const body = {
            pid: req.body.pid,
            package: JSON.parse(req.body.package)
        };
        t.is(body.pid, 1234);
        t.is(body.package.length, 1000);
        t.true((Date.now() - startTime) >= SLEEP_NORMAL_LOCAL * 1000);
        t.is(typeof body.package[0].mid, 'number');
        return { };
    });
    startTime = Date.now();
    await client.process();
});

// 现在会过滤同名的代理, 所以本测试无效
test.skip('Use Proxy', async (t) => {
    let startTime;
    mock.post(URL_UPLOAD_PACKAGE, (req) => {
        const body = {
            pid: req.body.pid,
            package: JSON.parse(req.body.package)
        };
        t.is(body.pid, 1234);
        t.is(body.package.length, 1000);
        t.true((Date.now() - startTime) < SLEEP_NORMAL_LOCAL * 1000);
        t.true((Date.now() - startTime) >= SLEEP_NORMAL_LOCAL * 500);
        return { };
    });
    startTime = Date.now();
    await client.process(['']);
});

// 现在会过滤同名的代理, 所以本测试无效
test.skip('Multi Proxy', async (t) => {
    const proxyList = Array(5).fill('');
    let startTime;
    mock.post(URL_UPLOAD_PACKAGE, (req) => {
        const body = {
            pid: req.body.pid,
            package: JSON.parse(req.body.package)
        };
        t.is(body.pid, 1234);
        t.is(body.package.length, 1000);
        t.true((Date.now() - startTime) < SLEEP_NORMAL_LOCAL * (1000 / proxyList.length + 2));
        t.true((Date.now() - startTime) >= SLEEP_NORMAL_LOCAL * (1000 / (proxyList.length + 1)));
        return { };
    });
    startTime = Date.now();
    await client.process(proxyList);
});
