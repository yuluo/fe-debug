let http = require('http'),
    httpProxy = require('http-proxy'),
    fs = require('fs'),
    finalhandler = require('finalhandler'),
    serveStatic = require('serve-static'),
    path = require('path'),
    _ = require('lodash'),
    reloadify = require('reloadify'),
    zlib = require('zlib'),
    opn = require('opn'),
    callbacks = [];

let config = require('./config.json');

callbacks = config.callbacks.map((callback) => {
    if (typeof(callback) == 'object') {
        callback.func = require('./' + callback.file); 
        return callback;
    } else {
        return require('./' + callback); 
    }
});

const verbose = ( process.argv.indexOf('--verbose') !== -1 || process.argv.indexOf('-v') !== -1 );
const incognito = ( process.argv.indexOf('--incognito') !== -1 || process.argv.indexOf('-i') !== -1 );

const log = function (str) {
    if (verbose) {
        console.log(str);
    }
};

let server;

function start (re) {
    const staticRegEx = /^\/static.*/;

    config.port = config.port || 80;
    
    let options = {
        secure: false,
        protocolRewrite: 'http',
        autoRewrite: true,
        target: config.remote 
    };

    let reload = reloadify(path.join(__dirname, config.pulse_fe));
    let serve = serveStatic(config.pulse_fe);
    let proxy = httpProxy.createProxyServer({});

    proxy.on('proxyRes', (proxyRes, req, res) => {

        if (proxyRes.headers['location']) {
            proxyRes.headers['location'] = proxyRes.headers['location'].replace('https://', 'http://');
        }

        let gzipped = /gzip/.test(proxyRes.headers['content-encoding']) && (proxyRes.req.path.indexOf('.') === -1) && (proxyRes.statusCode == 200 || proxyRes.statusCode == 404);
        
        if (gzipped) {
            let combinedBuffer, oldWrite, oldEnd;

            oldWrite = res.write;
            oldEnd = res.end;                

            proxyRes.headers['content-encoding'] = 'utf8';

            res.write = (chunk, encoding, callback) => {
                if (gzipped) {
                    if (chunk instanceof Buffer) {
                        if (undefined !== combinedBuffer) {
                            combinedBuffer = Buffer.concat([combinedBuffer, chunk])
                        } else {
                            combinedBuffer = chunk;
                        }
                    }
                } else {
                    oldWrite.call(res, chunk, encoding, callback);
                }
            };

            res.end = (chunk, encoding, callback) => {
                if (gzipped && undefined !== combinedBuffer) {
                    oldEnd.call(res, zlib.gunzipSync(combinedBuffer).toString(), "utf8", callback);
                    combinedBuffer = undefined;
                } else {
                    oldEnd.call(res, chunk, encoding, callback);
                }
            };
        }
    });
    
    let server = http.createServer( (req, res) => {
        reload(req, res, () => {
            let filePath;
            let url = req.url;

            if ( staticRegEx.test( req.url ) ) {
                url = url.replace(/\?.*$/, '');
                
                if ( ~url.indexOf( 'conf' ) && ~url.indexOf( 'json' ) ) {
                    filePath = config.web_core + url;
                } else {
                    filePath = config.pulse_fe + url;
                }
            }

            if ( staticRegEx.test( req.url ) && fs.existsSync(filePath) ) {
                log('[' + req.method + '][local] ' + req.url );
                serve(req, res, finalhandler(req, res));
            } else {
                log('[' + req.method + '][' + options.target + '] ' + req.url);
                proxy.web(req, res, options);
            }
        });
    });

    //Proxing WebSockets
    server.on('upgrade', (req, socket, head) => {
        try {
            proxy.ws(req, socket, options);
        } catch (e) {
            console.error(e);
        }
    });

    server.listen(config.port);

    if (!re) {
        console.info('\n[START] Listening on port ' + config.port + ' and using remote destination ' + options.target);
    } else {
        log('\n[RESTART] Listening on port ' + config.port + ' and using remote destination ' + options.target);
    }

    return server;    
}

let files = [];
const delay = 1000;
let restart = _.debounce((type, files) => {
    log('A file has changed, restarting...');

    //Run callbacks
    callbacks.forEach((callback) => {
        if (typeof(callback) == 'function') {
            callback(type, files);
        } else if (files.some((filename) => {
            return path.extname(filename).substr(1) == callback.ext;
        })) {
            callback.func(type, files);
        }
    });

    //Restart server
    server.close();
    server = start(true);

    //Reset files feed
    files.length = 0;
}, delay, {
    leading: false,
    trailing: true,
    maxWait: delay
});

fs.watch(config.pulse_fe, {recursive: true, persistent: true}, (type, filename) => {
    if (config.watch.some((ext) => {
        return path.extname(filename).substr(1) == ext;
    })) {
        files.push(filename);
        restart(type, files);
    }
});

server = start();

var opnOptions = {};
if (incognito) {
    opnOptions.app = ['chrome', '--incognito'];
}
opn( 'http://localhost:' + config.port, opnOptions );
