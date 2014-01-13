if (typeof GRUE == 'undefined') throw Error('GRUE global not found.');
/**
 * @fileOverview Bootstrap file to load the index module of a Grue project
 * @requires  Grue/base/base
 *
 * @example
 *     ...
 *     <body>
 *         ...
 *         ...
 *         <script type="text/javascript" src="/Grue/js/base/base.js"></script>
           <!-- add a constant specifying whether we're in dev or production mode. in production, modules will be cached client side  -->
           <script type="text/javascript">GRUE.set('mode', 'development')</script>
 *
 *         <script type="text/javascript" src="/Grue/js/bootstrap.js" data-index="index"></script>
 *     </body>
 *     ...
 */

(function (undefined) {
    var shared = {},
        global = (1, eval)(this),
        hasOwn = {}.hasOwnProperty,
        devmode = GRUE.get('mode') != 'production',
        XHR, testXHR, index, scripts, bootstrap, modules, keys, require;

    try {
        testXHR = new XMLHttpRequest();
        XHR = function () {return new XMLHttpRequest()};
    } catch (e) {
        try {
            testXHR = new ActiveXObject('Microsoft.XMLHTTP');
            XHR = function () {return new ActiveXObject('Microsoft.XMLHTTP')};
        } catch (e) {}
    } finally {
        if (!testXHR || !XHR)
            throw Error('Unable to create an xhr object');
        else
            testXHR = null;
    }

    scripts = document.getElementById('grue-bootstrap') || document.getElementsByTagName('script');
    scripts && scripts.nodeType == 1 && (bootstrap = scripts);

    if (!bootstrap) {
        for (var i = 0, l = scripts.length; i < l; i++) {
            if (~scripts[i].src.indexOf('bootstrap.js')) {
                bootstrap = scripts[i];
                break;
            }
        }
    }
    scripts = null;

    if (!bootstrap)
        throw Error('Unable to locate bootstrap script tag');

    // get the program's entry point from the dom
    index = bootstrap.getAttribute('data-main');
    bootstrap = null;

    /**
     * The require function passed into each module
     * @param  {string} path A module identifier
     * @return {mixed}       A module
     */
    // if (devmode)
        require = function require (path) {
            var module = {exports:{}};

            if (shared && shared[path])
                return shared[path];

            if (modules[path]) {
                // Evaluate in a clean environment and pass in the context. There
                // are two ways we can do this that make sense.

                // Way 1:
                // This is the more obvious, and probably more performant, approach.
                // It really only has one drawback, the code you view in the browser
                // will be wrapped in a function, which will make all your line
                // numbers off by 1.

                // var fn = new Function('exports, require, module, global, undefined', modules[path]);
                // fn(module.exports, require, module, this);

                // Way 2:
                // This gets around the line number problem by using eval within an
                // anonymous function, like so:

                (function (exports, require, module, global, undefined) {
                    eval(modules[path]);
                }(module.exports, require, module, global));

                !shared[path] && (shared[path] = module.exports);

                return module.exports;
            }
        }
    // else
    //     require = function require (path) {
    //         var module = {exports:{}};

    //         if (!shared[path] && modules[path])
    //             shared[path] = eval('(' + modules[path] + '(module.exports, require, module, global));');

    //         return shared[path];
    //     };


    function arrayToSet (array) {
        var set = {}, i = 0, l = array.length;
        for (; i < l; i++)
            set[array[i]] = 1;
        return set;
    }
    /**
     * Module loader
     * @memberOf  GRUE
     * @static
     * @param  {Function} require The function to pass into each module as its require
     * @param  {string} root    The entry point into the program being loaded
     * @param  {Object} [known] List of known modules, allows the server to
     *           only include modules that haven't been loaded yet, if the server
     *           is setup to do so.
     * @return {undefined}
     */
    function load (require, root, known, sync) {
        var request = XHR(),
            url = location.origin + '/requirer?r=' + encodeURIComponent(root);

        if (known && known.length)
            url += '&k=' + encodeURIComponent(JSON.stringify(known));
        url += '&m=' + (devmode ? 0 : 1);

        request.open('GET', url);

        devmode &&  request.setRequestHeader('Cache-Control', 'no-cache');
        request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        request.onreadystatechange = sync ? function () {
                if (this.readyState != 4)
                    return;
                sync(this);
            } : onLoad;
        request.send();
    }

    function onLoad (request) {
        if (!request && this.readyState != 4)
            return;

        var response = JSON.parse((request||this).responseText),
            name;

        if (!modules)
            modules = response.modules;
        else
            for (name in response.modules)
                !modules[name] && (modules[name] = response.modules[name]);
        require(response.__);
    }

    keys = Object.keys || function (obj) {
        var ret = [],
            prop;
        for (prop in obj)
            if (hasOwn.call(obj))
                ret.push(prop);
        return ret;
    }

    GRUE.load = function (root, sync) {
        return load(require, root, arrayToSet(keys(shared)), sync);
    };

    // the process is very simple. we perform an ajax request for the main
    // program and get back an object full of source strings.
    // All it takes to get the ball rolling is to load the main module, but,
    // because there are a few shims that should be evaluated before anything
    // else, we have a special, only to be used at startup, sequential option
    var fetchQueue = GRUE.__loadBeforeMain && GRUE.__loadBeforeMain.slice(0) || [],
        loadQueue = [],
        pending, waiting;

    fetchQueue.push(index);
    pending = fetchQueue.length;
    delete GRUE.__loadBeforeMain;

    for (var i = 0; i < fetchQueue.length; i++)
        GRUE.load(fetchQueue[i], function (req) {
            loadQueue.push(req);
        });

    function initWhenAllLoad () {
        clearTimeout(waiting);
        if (loadQueue.length == fetchQueue.length) {
            for (var i = 0; i < loadQueue.length; i++)
                onLoad(loadQueue[i]);
            loadQueue.length = 0;
            if (document.documentElement)
                document.documentElement.className = document.documentElement.className.replace(/js-off/, '');
        } else {
            waiting = setTimeout(initWhenAllLoad, 15);
        }
    }

    initWhenAllLoad();
}());