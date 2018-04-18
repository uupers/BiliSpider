const { loop } = require('./process');
const minimist = require('minimist');

const list = minimist(process.argv.slice(2), {
    alias: { 'p': 'proxy' },
    string: 'proxy',
    default: { proxy: [ ] }
});

// start code
(async () => {
    await loop(typeof list.proxy === 'string' ? [ list.proxy ] : list.proxy);
})();
