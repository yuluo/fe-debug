let cp = require('child_process'),
    path = require('path');
const config = require('./config.json');

module.exports = function (type, files) {
    try {
        cp.execSync('grunt less', {
            cwd: path.join(path.normalize(__dirname), path.normalize(config.grunt))
        });
        console.log('[SUCCESS] LESS files compiled to CSS');
    } catch (e) {
        console.error('[ERROR] LESS compilation failed');
    }
};