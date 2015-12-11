(function(root, factory)
{
    if (typeof define === 'function' && define.amd)
    {
        define([], factory);
    } else if (typeof module === 'object' && module.exports)
    {
        module.exports = factory();
    } else { root._ = factory() }
}(this, function ()
{
    var _ = {};

    function _define(name, requires, method)
    {
        _[name] = {
            requires: requires,
            body    : method
        };

        delete requireMarks[name];
    }

    function _init(methods)
    {
        for (var i = 0, len = methods.length; i < len; i++) _require(methods[i]);
    }

    var requireMarks = {};

    function _require(name)
    {
        if (requireMarks.hasOwnProperty(name)) return _[name];

        var requires = _[name].requires,
            body     = _[name].body,
            len      = requires.length;

        for (var i = 0; i < len; i++) requires[i] = _require(requires[i]);

        requires.push(_);

        var exports = body.apply(_, requires);
        if (exports) _[name] = exports;

        requireMarks[name] = true;

        return _[name];
    }

    _define('extend', ['_createAssigner', 'allKeys'], function (_createAssigner, allKeys)
    {
        var extend;

        extend = _createAssigner(allKeys);

        _.extend = extend;
    });

    _define('has', [], function ()
    {
        var has;

        var hasOwnProp = Object.prototype.hasOwnProperty;

        has = function (obj, key) { return hasOwnProp.call(obj, key) };

        _.has = has;
    });

    _define('readPaths', ['expandPaths'], function (expandPaths)
    {
        var readPaths;

        var fs    = require('fs'),
            async = require('async');

        readPaths = function (paths, options, callback)
        {
            expandPaths(paths, options, function (err, files)
            {
                if (err) return callback(err);

                async.map(files, function (file, callback)
                {
                    fs.readFile(file, options.encoding, function (err, data)
                    {
                        if (err) return callback(err);

                        callback(null, data);
                    });
                }, function (err, results)
                {
                    if (err) return callback(err);

                    callback(null, results);
                });
            });
        };

        _.readPaths = readPaths;
    });

    _define('isUndef', [], function ()
    {
        var isUndef;

        isUndef = function (value) { return value === void 0 };

        _.isUndef = isUndef;
    });

    _define('log', ['rpad', 'each'], function (rpad, each)
    {
        var log;

        var handlebars = require('handlebars'),
            fs         = require('fs'),
            chalk      = require('chalk');

        handlebars.registerHelper('rapd', function (len, ctx)
        {
            return rpad(ctx.fn(this), parseInt(len, 10));
        });

        each(['yellow', 'green', 'cyan', 'red', 'white', 'magenta'], function (color)
        {
            handlebars.registerHelper(color, function (ctx)
            {
                return chalk[color](ctx.fn(this));
            });
        });

        log = function (msg)
        {
            process.stdout.write(msg + '\n');
        };

        log.err = function (msg)
        {
            process.stdout.write(msg + '\n');
            process.exit();
        };

        var tpl = {};

        log.tpl = function (msg, tplPath)
        {
            if (tpl[tplPath])
            {
                log(tpl[tplPath](msg));
            } else
            {
                fs.readFile(tplPath, 'utf-8', function (err, data)
                {
                    if (err) return;

                    tpl[tplPath] = handlebars.compile(data, {noEscape: true});

                    log(tpl[tplPath](msg));
                });
            }
        };

        _.log = log;
    });

    _define('each', ['isArrLike', 'keys', 'optimizeCb'], function (isArrLike, keys, optimizeCb)
    {
        var each;

        each = function (obj, iteratee, ctx)
        {
            iteratee = optimizeCb(iteratee, ctx);

            var i, len;

            if (isArrLike(obj))
            {
                for (i = 0, len = obj.length; i < len; i++) iteratee(obj[i], i, obj);
            } else
            {
                var _keys = keys(obj);
                for (i = 0, len = _keys.length; i < len; i++)
                {
                    iteratee(obj[_keys[i]], _keys[i], obj);
                }
            }

            return obj;
        };

        _.each = each;
    });

    _define('stripComments', [], function ()
    {
        var stripComments;

        var regStripComments = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

        stripComments = function (str)
        {
            return str.replace(regStripComments, '');
        };

        _.stripComments = stripComments;
    });

    _define('expandPaths', ['each'], function (each)
    {
        var expandPaths;

        var async = require('async'),
            glob  = require('glob');

        expandPaths = function (paths, options, callback)
        {
            var files = [];

            var walker = async.queue(function (path, callback)
            {
                glob(path, {
                    ignore: options.exclude
                }, function (err, result)
                {
                    if (err) return callback(err);

                    files = files.concat(result);

                    callback();
                });
            }, 50);

            _.each(paths, function (val) { walker.push(val) });

            walker.drain = function () { callback(null, files)};
        };

        _.expandPaths = expandPaths;
    });

    _define('isArrLike', ['isNum', 'has'], function (isNum, has)
    {
        var isArrLike;

        var MAX_ARR_IDX = Math.pow(2, 53) - 1;

        isArrLike = function (val)
        {
            if (!has(val, 'length')) return false;

            var len = val.length;

            return isNum(len) && len >= 0 && len <= MAX_ARR_IDX;
        };

        _.isArrLike = isArrLike;
    });

    _define('allKeys', [], function ()
    {
        var allKeys;

        allKeys = function (obj)
        {
            var keys = [];

            for (var key in obj) keys.push(key);

            return keys;
        };

        _.allKeys = allKeys;
    });

    _define('rpad', ['pad'], function (pad)
    {
        var rpad;

        rpad = function (str, len, padStr)
        {
            return pad(str, len, padStr, 'r');
        };

        _.rpad = rpad;
    });

    _define('_createAssigner', ['isUndef'], function (isUndef)
    {
        var _createAssigner;

        _createAssigner = function (keysFunc, defaults)
        {
            return function (obj)
            {
                var len = arguments.length;

                if (defaults) obj = Object(obj);

                if (len < 2 || obj == null) return obj;

                for (var i = 1; i < len; i++)
                {
                    var src     = arguments[i],
                        keys    = keysFunc(src),
                        keysLen = keys.length;

                    for (var j = 0; j < keysLen; j++)
                    {
                        var key = keys[j];
                        if (!defaults || isUndef(obj[key])) obj[key] = src[key];
                    }
                }

                return obj;
            };
        };

        _._createAssigner = _createAssigner;
    });

    _define('_toStr', [], function ()
    {
        var _toStr;

        _toStr = Object.prototype.toString;

        _._toStr = _toStr;
    });

    _define('isObj', [], function ()
    {
        var isObj;

        isObj = function (val)
        {
            var type = typeof val;

            return type === 'function' || type === 'object';
        };

        _.isObj = isObj;
    });

    _define('pad', [], function ()
    {
        var pad;

        function strRepeat(str, qty)
        {
            var ret = '';

            if (qty < 1) return ret;

            while (qty > 0)
            {
                if (qty & 1) ret += str;
                qty >>= 1;
                str += str;
            }

            return ret;
        }

        pad = function (str, len, padStr, type)
        {
            padStr = padStr || ' ';
            padStr = padStr.charAt(0);

            var padLen = len - str.length;

            switch (type)
            {
                case 'r': return str + strRepeat(padStr, padLen);
                case 'l': return strRepeat(padStr, padLen) + str;
                default: return strRepeat(padStr, Math.ceil(padLen / 2)) +
                                str +
                                strRepeat(padStr, Math.floor(padLen /2));
            }
        };

        _.pad = pad;
    });

    _define('isNum', ['_toStr'], function (_toStr)
    {
        var isNum;

        isNum = function (value) { return _toStr.call(value) === '[object Number]' };

        _.isNum = isNum;
    });

    _define('keys', ['isObj', 'has'], function (isObj, has)
    {
        var keys;

        var nativeKeys = Object.keys;

        keys = nativeKeys || function (obj)
        {
            var keys = [];

            for (var key in obj) { if (has(obj, key)) keys.push(key) }

            return keys;
        };

        _.keys = keys;
    });

    _define('optimizeCb', ['isUndef'], function (isUndef)
    {
        var optimizeCb;

        optimizeCb = function (func, ctx, argCount)
        {
            if (isUndef(ctx)) return func;

            switch (argCount == null ? 3 : argCount)
            {
                case 1: return function (val)
                {
                    return func.call(ctx, val);
                };
                case 3: return function (val, idx, collection)
                {
                    return func.call(ctx, val, idx, collection);
                };
                case 4: return function (accumulator, val, idx, collection)
                {
                    return func.call(ctx, accumulator, val, idx, collection);
                }
            }

            return function ()
            {
                return func.apply(ctx, arguments);
            };
        };

        _.optimizeCb = optimizeCb;
    });

    _init([
        'extend',
        'has',
        'readPaths',
        'isUndef',
        'log',
        'each',
        'stripComments',
        'expandPaths',
        'isArrLike',
        'allKeys',
        'rpad',
        '_createAssigner',
        '_toStr',
        'isObj',
        'pad',
        'isNum',
        'keys',
        'optimizeCb'
    ]);

    return _;
}));