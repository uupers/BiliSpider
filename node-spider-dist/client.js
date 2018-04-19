const { client } = require('.');
const minimist = require('minimist');
const ProgressBar = require('progress');
const ora = require('ora');

const args = minimist(process.argv.slice(2), {
    alias: { 'p': 'proxy', 'q': 'quiet' },
    string: 'proxy',
    boolean: ['quiet', 'old'],
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
        });
        client.on(client.event.CATCH, (_, pid) => {
            const bar = barMap[pid];
            bar.tick({ 'pkg': pid });
        });
        client.on(client.event.SENDING, (pid) => {
            barMap[pid] = ora(`正在上传 Package ${pid}`).start();
        });
        client.on(client.event.SENDED, (pid) => {
            barMap[pid].succeed(`成功上传 Package ${pid}`);
            delete barMap[pid];
        });
    }
    await client.loop(proxyList);
})();
