/**
 * @fileOverview Creates a configuration object used to bootstrap the library.
 * This file should be included before any other grue file and before es5-shim and
 * es5-sham, which should in turn be included before any other grue files or
 * 3rd-party dependencies (unless you only target modern browsers).
 *
 * Much of the library will work without this, but it should be included if possible.
 *
 * NB These check the JS environment. Browser and DOM specific checks are in a
 * separate file to avoid errors when running on Node.
 *
 * @namespace GLOBAL
 * @module Grue/base
 */

if (typeof GRUE == 'object') {
    console.debug('GRUE already defined');
    return;
}

GRUE = {}; // implicit global

(function (global, undefined) {


// # Basic setup --------------------------------------------------------------

// Current version. This is a little confusing, but we got here because it went:
// library called Fortinbras --> specialized library called grue that included
// Fortinbras --> death of grue and ressurection of Fortinbras --> realization
// that grue is a better name --> grue
GRUE.version = '2.0.1';

GRUE.nop = function nop () {};

// ## Global Constants
// a place to store global constants. Accessed via GRUE.get and GRUE.set
var constants = {};

GRUE.set = function (name, value) {
    if (constants[name] !== undefined)
        throw Error('Constant "' + name + '" already defined as "' + constants[name] + '".');

    constants[name] = value;
};

GRUE.get = function (name) {
    var c = constants[name];

    if (c && typeof c == 'object')
        if (c.length)
            c = c.slice(0);
        else
            try {c = JSON.parse(JSON.stringify(c))} catch (e) {}
    return c || null;
};


// ## Console

// methods found on chrome's Console.prototype as of version 23. We'll use this
// both to guard against the indescriminate use of console.log and to aid in the
// development of our own logging infrastructure.
GRUE.set('consoleMethods', ['log', 'debug', 'error', 'info', 'warn', 'dir', 'dirxml', 'trace', 'assert', 'count', 'markTimeline', 'profile', 'profileEnd', 'time', 'timeEnd', 'timeStamp', 'group', 'groupCollapsed', 'groupEnd']);

// ### Console shim
// fix IE 8 and 9 console methods to be functions (IE10?)
typeof console == 'object' && typeof console.log == 'function' || (function () {
    var methods = GRUE.get('consoleMethods'),
        l = methods.length, i;

    typeof console == 'undefined' && (console = global.console);
    typeof console == 'undefined' && (console = global.console = {});

    // based on https://gist.github.com/1466437
    // helps with IE 8 & 9 console
    // see also http://whattheheadsaid.com/2011/04/internet-explorer-9s-problematic-console-object
    function makeCallable (name) {
        var method = console[name];

        if (!method || typeof method == 'function')
            return;

        console[name] = function () {
            var args = [];
            // chrome and firefox put spaces in if you have multiple arguments
            // IE doesn't. This adds the spaces.
            for (var i = 0, j = 0, l = arguments.length; i < l; i++, j++) {
                args[j] = arguments[i];
                args[++j] = ' ';
            }
            console[name].apply.call(method, console, args);
        };
    }

    for (i = 0; i < l; i++)
        if (!console[methods[i]])
            (function (i) {
                console[methods[i]] = function () {
                    return console.log.apply(console, [methods[i] + ':'].concat(arguments));
                };
            }(i));
        else if (typeof console[methods[i]] != 'function')
            makeCallable(methods[i]);
}());


// ## Feature detection -------------------------------------------------------
// We want this file to be loaded before any others and we repeat many of the
// tests that occur in ES5-shim and sham so we can tell whether we're in a shimmed
// browser later. Currently, much of Grue requires ES5 getters and setters and will
// not work in IE < 9.

var fnProto  = Function.prototype,
    objProto = Object.prototype,
    arrProto = Array.prototype,

    slice  = [].slice,
    hasOwn = {}.hasOwnProperty,
    toStr  = {}.toString,
    call   = fnProto.call,

// this will help deal with IE<9's interpretation of ECMA-262 §6.6.2.2
// This is required if we support IE 8.
    dontEnum = [
        'toString',
        'toLocaleString',
        'valueOf',
        'hasOwnProperty',
        'isPrototypeOf',
        'propertyIsEnumerable',
        'constructor'
    ],
    prop, dummy, bind, Type, ws, e;


// FIXME -- do we care about IE 8 or not?

// assuming this file is loaded before es5-shim and es5-sham, "has" will tell
// you whether a given environment has native support for most of the functions
// or properties that we might have shimmed.
var has = {
    obj_keys: !!Object.keys,
    obj_dontEnumBug: true, // test comes later
    obj_getPrototypeOf: !!Object.getPrototypeOf,
    obj_getOwnPropertyDescriptor: !!Object.getOwnPropertyDescriptor,
    obj_getOwnPropertyNames: !!Object.getOwnPropertyNames,
    obj_create: !!Object.create,
    obj_defineProperty: false,   // test comes later
    obj_defineProperties: false, // test comes later
    obj_jsXcessors: hasOwn.call(objProto, '__defineGetter__'),
    obj_nullProto: false,  // test comes later
    obj_seal: !!Object.seal,
    obj_freeze: !!Object.freeze,
    obj_preventExtensions: !!Object.preventExtensions,
    obj_isSealed: !!Object.isSealed,
    obj_isFrozen: !!Object.isFrozen,
    obj_isExtensible: !!Object.isExtensible
};

GRUE.has = function (prop, value) {
    if (typeof value != 'undefined')
        has[prop] = value;
    return has[prop];
};

// ### Objects
// Test for old IE's failure to enumerate properties which shadow {}.prototype props
for (prop in {toString:true})
    has.obj_dontEnumBug = false;

if (has.obj_dontEnumBug)
    GRUE.set('dontEnumBug', dontEnum);

try {
    if (!!Object.defineProperty) {
        dummy = {};
        Object.defineProperty(dummy, 'foo', {});
        has.obj_defineProperty = 'foo' in dummy;
    }
} catch (e) {} finally {dummy = null}

try {
    if (!!Object.defineProperties) {
        dummy = {};
        Object.defineProperties(dummy, {'a':{value: '123'}, 'b':{value:'456'}});
        has.obj_defineProperties = 'b' in dummy;
    }
} catch (e) {} finally {dummy = null}


has.obj_proto = '__proto__' in {};

try {
    dummy = Object.create ? Object.create(null) : {};
    if (has.obj_proto) {
        dummy.__proto__ !== null && (dummy.__proto__ = null);
        has.obj_nullProto = dummy.__proto__ === null && typeof dummy.hasOwnProperty == 'undefined';
    }
} catch (e) {} finally {dummy = null}

// #### Xcessors
// much of Grue will not work without ES5 Xcessors
// we prefer to set them with Object.defineProperty, so first check for that
try { // we could be in IE 8
    if (has.obj_defineProperty) {
        dummy = {};
        Object.defineProperty(dummy, 'name', {
            get: function () {return dummy._name.toUpperCase()},
            set: function (value) {dummy._name = value}
        });
    }
    dummy.name = 't';
    dummy.name == 'T' && (has.obj_es5xcessors = true);
} catch (e) {
    console.warn('Object.defineProperty cannot create accessors');
} finally {
    dummy = null;
}

// ### Functions
has.fn_bind = !!fnProto.bind;

// ### Arrays
has.array_splice  = [1,2].splice(0).length == 2;
has.array_isArray = Array.isArray && Array.isArray([]) == true;
has.array_forEach = !!arrProto.forEach;
has.array_map     = !!arrProto.map;
has.array_filter  = !!arrProto.filter;
has.array_every   = !!arrProto.every;
has.array_some    = !!arrProto.some;
has.array_reduce  = !!arrProto.reduce;
has.array_reduceRight  = !!arrProto.reduceRight;
has.array_indexOf = !!arrProto.indexOf;
has.array_lastIndexOf = !!arrProto.lastIndexOf;

// ### Date
has.date_toISOString = Date.prototype.toISOString && (new Date(-62198755200000).toISOString().indexOf('-000001') != -1);


// ### JSON
try {
    has.JSON = JSON && JSON.stringify && JSON.stringify({"a":1}) == "{\"a\":1}" && JSON.parse && JSON.parse("{\"a\":1}").a == 1;
} catch (e) {has.JSON = false}

// ### Strings
// 15.5.4.20 String.prototype.trim ( )
// The following steps are taken:
// Call CheckObjectCoercible passing the this value as its argument.
// Let S be the result of calling ToString, giving it the this value as its argument.
// Let T be a String value that is a copy of S with both leading and trailing white space removed. The definition of white space is the union of WhiteSpace and LineTerminator.
// Return T.

// whitespace
//   Code Unit Value  |  Name
// =====================================================
//   \u0009           |  Tab
//   \u000B           |  Vertical Tab
//   \u000C           |  Form Feed
//   \u0020           |  Space
//   \u00A0           |  No-break space
//   \uFEFF           |  Byte Order Mark
//
// line terminators
//   Code Unit Value  |  Name
// =====================================================
//   \u000A           |  Line Feed
//   \u000D           |  Carriage Return
//   \u2028           |  Line separator
//   \u2029           |  Paragraph separator
//
// Any other Unicode “space separator”
//   Code Unit Value  |  Name
// =====================================================
//   \u1680           |  Ogham Space Mark     
//   \u180E           |  Mongolian Vowel Separator
//   \u2000           |  En Quad
//   \u2001           |  Em Quad
//   \u2002           |  En Space
//   \u2003           |  Em Space
//   \u2004           |  Three-per-em Space
//   \u2005           |  Four-per-em Space
//   \u2006           |  Six-per-em Space
//   \u2007           |  Figure Space
//   \u2008           |  Punctuation Space
//   \u2009           |  Thin Space
//   \u200A           |  Hair Space
//   \u202F           |  Narrow No-break Space
//   \u205F           |  Medium Mathematical Space
//   \u3000           |  Ideographic Space


ws =
'\u0009\u000B\u000C\u0020\u00A0\uFEFF\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005'+
'\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u000A\u000D\u2028\u2029';

has.str_trim = ''.trim && !ws.trim();

// subscript access on string literals and strings created via String covers
// the majority of cases. If you are creating strings using Object as a
// factory, stop it.
GRUE.stringSupportsSubscript = 'abc'[1] + String('xyz')[0] == 'bx';

// but, to be certain, use this check
has.str_subscriptAccess = GRUE.stringSupportsSubscript && Object('xyz')[0] == 'x';

// # Conditionally load some shims
if (typeof GRUE.__loadBeforeMain == 'undefined')
    GRUE.__loadBeforeMain = [];

// GRUE.load is added by bootstrap.js in the browser or ??? in Node
// bootstrap.js will check the queue before loading the main modules
if (!has.array_reduce)
    GRUE.__loadBeforeMain.push('/Grue/js/vendor/es5-shim/es5-shim.min') && console.debug('added es5-shim to queue');

if (!has.obj_nullProto)
    GRUE.__loadBeforeMain.push('/Grue/js/vendor/es5-shim/es5-sham.min') && console.debug('added es5-sham to queue');

// SOME DOM related bits, after all
if (typeof window != 'undefined' && window == global) {
    GRUE.has('dom_classList', 'classList' in document.createElement('i'));

    if (!GRUE.has('dom_classList'))
        GRUE.__loadBeforeMain.push('/Grue/js/vendor/classList/classList') && console.debug('added classList shim to queue');
}


}((1,eval)('this')));