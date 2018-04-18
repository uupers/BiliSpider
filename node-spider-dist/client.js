const { client } = require('.');
const minimist = require('minimist');
const ProgressBar = require('progress');
const ora = require('ora');

const list = minimist(process.argv.slice(2), {
    alias: { 'p': 'proxy' },
    string: 'proxy',
    default: { proxy: [ ] }
});

const proxyList =
    typeof list.proxy === 'string' ? [ list.proxy ] : list.proxy;

const barMap = { };

// start code
(async () => {
    require('cfonts').say('UUPERS', { align: 'center', font: 'block' });
    client.on(client.event.START, (pid, mids) => {
        const format = 'Package :pkg [:bar] :percent :rate/urs :elapseds';
        barMap[pid] = new ProgressBar(format, {
            width: 50,
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
    client.setOutput();
    await client.loop(proxyList);
})();
