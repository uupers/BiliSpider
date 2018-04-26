const { client } = require('.');
const minimist = require('minimist');
const ProgressBar = require('progress');
const ora = require('ora');

const xdaili = require('./client/proxy/xdaili');
const xicidaili = require('./client/proxy/xicidaili');
const kuaidaili = require('./client/proxy/kuaidaili');
const cnProxy = require('./client/proxy/cn-proxy');
const ip89 = require('./client/proxy/89ip');
const yundaili = require('./client/proxy/yundaili');
const mogudaili = require('./client/proxy/mogudaili');
const mayidaili = require('./client/proxy/mayidaili');

const args = minimist(process.argv.slice(2), {
    alias: { 'p': 'proxy', 'q': 'quiet', 'np': 'netproxy' },
    string: 'proxy',
    boolean: ['quiet', 'old', 'netproxy', 'dev'],
    default: { proxy: [ ], quiet: false, old: false }
});

const config = require('y-config');
config.args = args;

const proxyList =
    typeof args.proxy === 'string' ? [ args.proxy ] : args.proxy;

const barMap = { };

const startLoop = async () => {
    try {
        return await client.loop(proxyList);
    } catch (error) {
        return startLoop();
    }
};

// start code
(async () => {
    require('cfonts').say('UUPERS', { align: 'left', font: 'block' });
    if (args.quiet) {
        client.setOutput();
    } else if (!args.old) {
        let spiderInfo;
        client.setOutput();
        client.on(client.event.START, (pid, mids) => {
            const format =
                'Package :pkg [:bar] :percent :rate/urs:active:ban:ips :elapseds';
            barMap[pid] = new ProgressBar(format, {
                width: 25,
                total: mids.length
            });
            barMap[pid].tick(0, { 'pkg': pid });
        });
        client.on(client.event.HEART, (pid, info) => {
            const bar = barMap[pid];
            if (!bar) {
                return;
            }
            spiderInfo = info;
            const a = `${spiderInfo.active}${spiderInfo.ban === 0 ? '' : 'A'}`;
            bar.tick(0, {
                'pkg': pid,
                'active': spiderInfo.total <= 1 ? '' : `[${a}`,
                'ban': spiderInfo.ban === 0 ? '' : `,${spiderInfo.ban}B`,
                'ips': spiderInfo.total <= 1 ? '' : `/${spiderInfo.total}IPs]`
            });
        });
        client.on(client.event.CATCH, (pid, mid, cardList) => {
            const bar = barMap[pid];
            if (!bar) {
                return;
            }
            const a = `${spiderInfo.active}${spiderInfo.ban === 0 ? '' : 'A'}`;
            bar.tick({
                'pkg': pid,
                'active': spiderInfo.total <= 1 ? '' : `[${a}`,
                'ban': spiderInfo.ban === 0 ? '' : `,${spiderInfo.ban}B`,
                'ips': spiderInfo.total <= 1 ? '' : `/${spiderInfo.total}IPs]`
            });
        });
        client.on(client.event.END, (pid) => {
            delete barMap[pid];
        });
        client.on(client.event.TIMEOUT, (pid) => {
            delete barMap[pid];
            ora(`获取超时 Package ${pid}`).fail();
        });
        client.on(client.event.VING, (pid) => {
            barMap[pid] = ora(`正在校检 Package ${pid}`).start();
        });
        client.on(client.event.VFAIL, (pid) => {
            barMap[pid].fail(`数据有误 Package ${pid}`);
            delete barMap[pid];
        });
        client.on(client.event.SENDING, (pid) => {
            barMap[pid].start(`正在上传 Package ${pid}`);
        });
        client.on(client.event.SENDED, (pid) => {
            barMap[pid].succeed(`成功上传 Package ${pid}`);
            delete barMap[pid];
        });
        client.on(client.event.SENDFAIL, (pid) => {
            barMap[pid].fail(`上传失败 Package ${pid}`);
            delete barMap[pid];
        });
    }
    if (args.np) {
        xdaili.process();
        xicidaili.process();
        kuaidaili.process();
        cnProxy.process();
        ip89.process();
        yundaili.process();
        mogudaili.process();
        mayidaili.process();
    }
    await startLoop();
})();
