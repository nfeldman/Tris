/**
 * @fileOverview A simple testing server that uses requirer to generate a single
 * javascript file, starting from an application's entry point. 
 */

var http = require('http'),
    fs   = require('fs'),
    path = require('path'),
    parseUrl = require('url').parse,
    parseQuery = require('querystring').parse,

    Bundler = require('./requirer/components/Bundler'),

    mime = {
        'json': 'application/json',
        'swf' : 'application/x-shockwave-flash',
        'js'  : 'application/javascript',
        'css' : 'text/css',
        'txt' : 'text/plain',
        'html': 'text/html',
        'xml' : 'text/xml',
        'ico' : 'image/x-icon'
    },
    root = path.resolve(__dirname);

// most of these will be from files that don't exist
process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
});

http.createServer(function (request, response) {
    var url = parseUrl(request.url),
        query = parseQuery(url.query),
        pathname = url.pathname,
        name = pathname.split('/').pop(),
        type = mime[pathname.slice(pathname.lastIndexOf('.') + 1).toLowerCase()] || 'text/plain',
        bundler, relativeID;

    if (~pathname.indexOf('..')) {
        response.writeHead(404, {'content-type':'text/html'});
        response.write('<html><h1>404 File Not Found</h1></html>');
        response.end();
        console.warn('returned 404 to attempted directory traversal');
        return;
    }

    if (pathname[0] == '/')
        pathname = __dirname + pathname;
    if (~pathname.indexOf('./'))
        pathname = __dirname + pathname.slice(1);

    if (request.headers['x-requested-with'] == 'XMLHttpRequest' && name == 'requirer') {
        bundler = new Bundler();
        console.time('serving bundle');
        relativeID = query.r;
        if (!/^(?:\.{1,2}|\/)/.test(relativeID))
            relativeID = './' + relativeID;

        bundler.onReady(function (err, modules) {
            if (err) {
                response.writeHead(404, {'content-type':'application/json'});
                response.write('{"error":"Unabled to create module bundle"}');
                response.end();
                console.timeEnd('serving bundle');
                return;
            }

            // TODO configure caching based on value of ```m``` param
            response.writeHead(200, {
                'content-type': 'application/json',
                'cache-control': 'no-cache, must-revalidate',
                'expires': 'Sat, 26 Jul 1997 05:00:00 GMT'
            });

            response.write(JSON.stringify(modules));
            response.end();
            console.timeEnd('serving bundle');
        });

        console.log(__dirname, relativeID,
                    path.resolve(__dirname, '../'), query.m, query.k)
        return bundler.getModules(__dirname, relativeID,
                    path.resolve(__dirname, '../'), query.m, query.k);
    }

    console.time('serving ' + pathname);

    fs.exists(pathname, function (exists) {
        if (!exists) {
            response.writeHead(404);
            response.write('<html><h1>404 File Not Found</h1></html>');
            response.end();
            console.timeEnd('serving ' + pathname);
            return;
        }

        response.writeHead(200, {
            'content-type': mime[pathname.slice(pathname.lastIndexOf('.') + 1).toLowerCase()],
            'cache-control': 'no-cache, must-revalidate',
            'expires': 'Sat, 26 Jul 1997 05:00:00 GMT'
        });


        return fs.createReadStream(pathname).on('data', function (data) {
            response.write(data);
        }).on('end', function () {
            response.end();
            console.timeEnd('serving ' + pathname);
        });
    });

}).listen(8080);