const { client } = require('.');
const minimist = require('minimist');
const ProgressBar = require('progress');
const ora = require('ora');

const xdaili = require('./client/proxy/xdaili');
const xicidaili = require('./client/proxy/xicidaili');
const kuaidaili = require('./client/proxy/kuaidaili');
const cnProxy = require('./client/proxy/cn-proxy');

const args = minimist(process.argv.slice(2), {
    alias: { 'p': 'proxy', 'q': 'quiet', 'np': 'netproxy' },
    string: 'proxy',
    boolean: ['quiet', 'old', 'netproxy'],
    default: { proxy: [ ], quiet: false, old: false }
});

const proxyList =
    typeof args.proxy === 'string' ? [ args.proxy ] : args.proxy;

const barMap = { };

// start code
(async () => {
    require('cfonts').say('UUPERS', { align: 'left', font: 'block' });
    if (args.quiet) {
        client.setOutput();
    } else if (!args.old) {
        client.setOutput();
        client.on(client.event.START, (pid, mids) => {
            const format = 'Package :pkg [:bar] :percent :rate/urs :elapseds';
            barMap[pid] = new ProgressBar(format, {
                width: 40,
                total: mids.length
            });
            barMap[pid].tick(0, { 'pkg': pid });
        });
        client.on(client.event.CATCH, (pid, mid, cardList) => {
            const bar = barMap[pid];
            bar.tick({ 'pkg': pid });
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
    }
    if (args.np) {
        xdaili.process();
        xicidaili.process();
        kuaidaili.process();
        cnProxy.process();
    }
    await client.loop(proxyList);
})();
