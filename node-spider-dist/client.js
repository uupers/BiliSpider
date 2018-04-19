const { client } = require('.');
const minimist = require('minimist');
const ProgressBar = require('progress');
const ora = require('ora');

const xdaili = require('./client/proxy/xdaili');
const xicidaili = require('./client/proxy/xicidaili');

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
        client.on(client.event.CATCH, (_, pid, mid, cardList) => {
            const bar = barMap[pid];
            bar.tick(cardList.length - bar.curr, { 'pkg': pid });
        });
        client.on(client.event.END, (_, pid, cardList) => {
            const bar = barMap[pid];
            bar.tick(cardList.length, { 'pkg': pid });
            delete barMap[pid];
        });
        client.on(client.event.SENDING, (pid) => {
            barMap[pid] = ora(`正在上传 Package ${pid}`).start();
        });
        client.on(client.event.SENDED, (pid) => {
            barMap[pid].succeed(`成功上传 Package ${pid}`);
            delete barMap[pid];
        });
    }
    if (args.np) {
        xdaili.process();
        xicidaili.process();
    }
    await client.loop(proxyList);
})();
