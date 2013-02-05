

/**
 * hasOwnProperty.
 */

var has = Object.prototype.hasOwnProperty;

/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module.exports) {
    module.exports = {};
    module.client = module.component = true;
    module.call(this, module.exports, require.relative(resolved), module);
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);
  var index = path + '/index.js';

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (has.call(require.modules, path)) return path;
  }

  if (has.call(require.aliases, index)) {
    return require.aliases[index];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!has.call(require.modules, from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return has.call(require.modules, localRequire.resolve(path));
  };

  return localRequire;
};
require.register("component-to-function/index.js", Function("exports, require, module",
"\n/**\n * Expose `toFunction()`.\n */\n\nmodule.exports = toFunction;\n\n/**\n * Convert `obj` to a `Function`.\n *\n * @param {Mixed} obj\n * @return {Function}\n * @api private\n */\n\nfunction toFunction(obj) {\n  switch ({}.toString.call(obj)) {\n    case '[object Object]':\n      return objectToFunction(obj);\n    case '[object Function]':\n      return obj;\n    case '[object String]':\n      return stringToFunction(obj);\n    case '[object RegExp]':\n      return regexpToFunction(obj);\n    default:\n      return defaultToFunction(obj);\n  }\n}\n\n/**\n * Default to strict equality.\n *\n * @param {Mixed} val\n * @return {Function}\n * @api private\n */\n\nfunction defaultToFunction(val) {\n  return function(obj){\n    return val === obj;\n  }\n}\n\n/**\n * Convert `re` to a function.\n *\n * @param {RegExp} re\n * @return {Function}\n * @api private\n */\n\nfunction regexpToFunction(re) {\n  return function(obj){\n    return re.test(obj);\n  }\n}\n\n/**\n * Convert property `str` to a function.\n *\n * @param {String} str\n * @return {Function}\n * @api private\n */\n\nfunction stringToFunction(str) {\n  // immediate such as \"> 20\"\n  if (/^ *\\W+/.test(str)) return new Function('_', 'return _ ' + str);\n\n  // properties such as \"name.first\" or \"age > 18\"\n  return new Function('_', 'return _.' + str);\n}\n\n/**\n * Convert `object` to a function.\n *\n * @param {Object} object\n * @return {Function}\n * @api private\n */\n\nfunction objectToFunction(obj) {\n  var match = {}\n  for (var key in obj) {\n    match[key] = typeof obj[key] === 'string'\n      ? defaultToFunction(obj[key])\n      : toFunction(obj[key])\n  }\n  return function(val){\n    if (typeof val !== 'object') return false;\n    for (var key in match) {\n      if (!(key in val)) return false;\n      if (!match[key](val[key])) return false;\n    }\n    return true;\n  }\n}\n//@ sourceURL=component-to-function/index.js"
));
require.register("component-mean/index.js", Function("exports, require, module",
"\n/**\n * Module dependencies.\n */\n\nvar toFunction = require('to-function');\n\n/**\n * Return the mean value in `arr` with optional callback `fn(val, i)`.\n *\n * @param {Array} arr\n * @param {Function} [fn]\n * @return {Number}\n * @api public\n */\n\nmodule.exports = function(arr, fn){\n  if (0 == arr.length) return null;\n  var sum = 0;\n\n  if (fn) {\n    fn = toFunction(fn);\n    for (var i = 0; i < arr.length; ++i) {\n      sum += fn(arr[i], i);\n    }\n  } else {\n    for (var i = 0; i < arr.length; ++i) {\n      sum += arr[i];\n    }\n  }\n\n  return sum / arr.length;\n};\n//@ sourceURL=component-mean/index.js"
));
require.register("component-variance/index.js", Function("exports, require, module",
"\n/**\n * Module dependencies.\n */\n\nvar toFunction = require('to-function')\n  , mean = require('mean');\n\n/**\n * Return the variance of `arr` with optional callback `fn(val, i)`.\n *\n * @param {Array} arr\n * @param {Function} [fn]\n * @return {Number}\n * @api public\n */\n\nmodule.exports = function(arr, fn){\n  if (0 == arr.length) return null;\n\n  var m = mean(arr);\n  var d = [];\n\n  if (fn) {\n    fn = toFunction(fn);\n    for (var i = 0; i < arr.length; i++) {\n      d.push(Math.pow(fn(arr[i], i) - m, 2));\n    }\n  } else {\n    for (var i = 0; i < arr.length; i++) {\n      d.push(Math.pow(arr[i] - m, 2));\n    }\n  }\n\n  return mean(d);\n};\n//@ sourceURL=component-variance/index.js"
));
require.register("component-standard-deviation/index.js", Function("exports, require, module",
"\n/**\n * Module dependencies.\n */\n\nvar variance = require('variance');\n\n/**\n * Return the standard deviation of `arr` with optional callback `fn(val, i)`.\n *\n * @param {Array} arr\n * @param {Function} [fn]\n * @return {Number}\n * @api public\n */\n\nmodule.exports = function(arr, fn){\n  if (0 == arr.length) return null;\n  return Math.sqrt(variance(arr, fn));\n};\n//@ sourceURL=component-standard-deviation/index.js"
));
require.register("publicclass-median/index.js", Function("exports, require, module",
"\n/**\n * Return the median of the numbers in `arr`.\n *\n * @param {Array} arr\n * @return {Number}\n * @api public\n */\n\nmodule.exports = function(arr){\n  var n = arr.length;\n  if( n % 2 == 0 ){\n    return arr[n/2];\n  } else {\n    var l = Math.floor(n/2)\n    return (arr[l] + arr[l+1]) / 2;\n  }\n}//@ sourceURL=publicclass-median/index.js"
));
require.register("publicclass-latency/index.js", Function("exports, require, module",
"\n/**\n * Module dependencies.\n */\nvar median = require('median')\n  , sd = require('standard-deviation');\n\n\n/**\n * Calculates the latency from an `arr` of\n * times (each the result of `now - started`).\n *\n * Based on: http://www.gamedev.net/page/resources/_/technical/multiplayer-and-network-programming/clock-synchronization-of-client-programs-r2493\n *\n * @param {Array} arr\n * @return {Number}\n * @api public\n */\nmodule.exports = function(arr){\n  var std = sd(arr);\n  var m = median(arr);\n  var sum = 0;\n  var n = 0;\n  for (var i = 0; i < arr.length; ++i) {\n    if( Math.abs(m - arr[i]) <= std ){\n      sum += arr[i];\n      n++;\n    }\n  }\n  return sum / n;\n}//@ sourceURL=publicclass-latency/index.js"
));
require.register("publicclass-base64-arraybuffer/index.js", Function("exports, require, module",
"/*\n * base64-arraybuffer\n * https://github.com/niklasvh/base64-arraybuffer\n *\n * Copyright (c) 2012 Niklas von Hertzen\n * Licensed under the MIT license.\n */\n\nvar chars = \"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/\";\n\nexports.encode = function(arraybuffer) {\n  var bytes = new Uint8Array(arraybuffer)\n    , len = bytes.byteLength\n    , base64 = \"\";\n\n  for(var i = 0; i < len; i+=3){\n    base64 += chars[bytes[i] >> 2];\n    base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];\n    base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];\n    base64 += chars[bytes[i + 2] & 63];\n  }\n\n  if ((len % 3) === 2) {\n    base64 = base64.substring(0, base64.length - 1) + \"=\";\n  } else if (len % 3 === 1) {\n    base64 = base64.substring(0, base64.length - 2) + \"==\";\n  }\n\n  return base64;\n};\n\nexports.decode =  function(base64) {\n  var bufferLength = base64.length * 0.75\n    , len = base64.length\n    , p = 0\n    , encoded1\n    , encoded2\n    , encoded3\n    , encoded4;\n\n  if (base64[base64.length - 1] === \"=\") {\n    bufferLength--;\n    if (base64[base64.length - 2] === \"=\") {\n      bufferLength--;\n    }\n  }\n\n  var arraybuffer = new ArrayBuffer(bufferLength),\n  bytes = new Uint8Array(arraybuffer);\n\n  for(var i=0; i < len; i+=4){\n    encoded1 = chars.indexOf(base64[i]);\n    encoded2 = chars.indexOf(base64[i+1]);\n    encoded3 = chars.indexOf(base64[i+2]);\n    encoded4 = chars.indexOf(base64[i+3]);\n\n    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);\n    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);\n    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);\n  }\n\n  return arraybuffer;\n};//@ sourceURL=publicclass-base64-arraybuffer/index.js"
));
require.register("netchan/index.js", Function("exports, require, module",
"\nvar latency = require('latency');\n\n\nmodule.exports = NetChannel;\n\n/**\n * NetChannel wraps an unreliable DataChannel\n * with a sequence and an ack.\n *\n * When a message is received it checks the ack against\n * the messages buffer and the ones \"acknowledged\" will\n * be removed from the buffer and the rest will be resent.\n *\n * After sending and the buffer is not empty after a timeout\n * it will try to send again until it is.\n *\n * It will also track the latency of the packets by keeping\n * a list of times when each sequence was sent and comparing\n * against that when that sequence has been acknowledged.\n *\n * Inspired by NetChan by Id software.\n */\n\nfunction NetChannel(channel){\n  this.seq = 1;\n  this.ack = 0;\n  this.buffer = []; // [seq,buf]\n  this.bufferLength = 0;\n  this.sequences = [];\n  this.latency = undefined;\n  this.sent = {};\n  this.times = [];\n  this.timesIndex = 0;\n\n  // optional (for testing)\n  if( channel ){\n    if( channel.reliable )\n      throw new ArgumentError('channel must be unreliable. just use the normal data channel instead.')\n    var netchan = this;\n    this.channel = channel;\n    this.channel.addEventListener('message',function(e){ netchan.recv(e) },false)\n  }\n}\n\nNetChannel.prototype = {\n\n  onmessage: noop,\n  onlatency: noop,\n\n  recv: function(e){\n    this.decode(e.data)\n    this.flush()\n  },\n\n  send: function(msg){\n    // accept any TypedArray\n    if( msg && (msg.buffer instanceof ArrayBuffer) )\n      msg = msg.buffer;\n\n    if( !(msg instanceof ArrayBuffer) )\n      throw new Error('invalid message type, only binary is supported');\n\n    if( msg.byteLength > 255 )\n      throw new Error('invalid message length, only up to 256 bytes are supported')\n\n    // grow by 3 bytes (seq & len)\n    var seq = this.seq++;\n    var buf = new Uint8Array(3+msg.byteLength);\n    var dat = new DataView(buf.buffer);\n    dat.setUint16(0,seq);\n    dat.setUint8(2,msg.byteLength);\n    buf.set(new Uint8Array(msg),3);\n\n    this.bufferLength += buf.byteLength;\n    this.buffer.push(seq,buf);\n    this.sent[''+seq] = Date.now();\n\n    this.flush();\n  },\n\n  flush: function(){\n    if( this.bufferLength && this.channel )\n      this.channel.send(this.encode());\n  },\n\n  // encodes into a message like this:\n  // ack,seq1,len1,data1[,seq2,len2,data2...]\n  encode: function(){\n    // grow by 2 bytes (ack) + unsent buffer\n    var buf = new Uint8Array(2+this.bufferLength);\n    var data = new DataView(buf.buffer);\n\n    // prepend with ack number\n    data.setUint16(0,this.ack)\n\n    // write all buffered messages\n    var offset = 2;\n    for(var i=1; i < this.buffer.length; i+=2){\n      var msg = this.buffer[i];\n      buf.set(msg,offset);\n      offset += msg.byteLength;\n    }\n    return buf.buffer;\n  },\n\n  // decodes from a message like this:\n  // ack,seq1,len1,data1[,seq2,len2,data2...]\n  decode: function(buf){\n    // read the sequence and ack\n    var data = new DataView(buf.buffer || buf)\n    var ack = data.getUint16(0)\n\n    // read messages\n    var offset = 2 // start after ack\n      , length = buf.byteLength\n      , seq = this.ack // in case no messages are read, its the same\n      , len = 0;\n\n    while(offset < length){\n      seq = data.getUint16(offset);\n      len = data.getUint8(offset+2);\n      if( seq <= this.ack ){\n        offset += len+3; // len + seq = 3 bytes\n        continue;\n      }\n\n      if( this.sent[''+seq] ){\n        // store the time it took to get an ack\n        // in a circular times buffer\n        this.times[this.timesIndex] = Date.now() - this.sent[''+seq];\n        delete this.sent[''+seq];\n        this.timesIndex = (this.timesIndex + 1) % 30;\n\n        // recalc every 10 message\n        if( this.timesIndex % 10 == 0 ){\n          this.latency = latency(this.times);\n          this.onlatency(this.latency);\n        }\n      }\n\n      // get the message\n      var msg = data.buffer.slice(offset+3,offset+3+len);\n      offset += len+3;\n\n      // emit onmessage for each message\n      this.onmessage(msg)\n    }\n\n    // store the sequence as the last acknowledged one\n    this.ack = seq;\n\n    this.shrink()\n  },\n\n  // shrink the buffer & bufferLength up to the\n  // acknowledged messages.\n  // assumes this.buffer is sorted by sequence\n  shrink: function(){\n    var index = null\n      , length = 0;\n    for(var i=0; i < this.buffer.length; i+=2){\n      var s = this.buffer[i];\n      if( s <= this.ack ){\n        index = i+2;\n        length += this.buffer[i+1].byteLength;\n      }\n    }\n    if( index !== null ){\n      this.buffer.splice(0,index);\n      this.bufferLength -= length;\n    }\n  }\n\n}\n\nfunction noop(){}//@ sourceURL=netchan/index.js"
));
require.alias("publicclass-latency/index.js", "netchan/deps/latency/index.js");
require.alias("component-standard-deviation/index.js", "publicclass-latency/deps/standard-deviation/index.js");
require.alias("component-variance/index.js", "component-standard-deviation/deps/variance/index.js");
require.alias("component-to-function/index.js", "component-variance/deps/to-function/index.js");

require.alias("component-mean/index.js", "component-variance/deps/mean/index.js");
require.alias("component-to-function/index.js", "component-mean/deps/to-function/index.js");

require.alias("publicclass-median/index.js", "publicclass-latency/deps/median/index.js");

require.alias("publicclass-base64-arraybuffer/index.js", "netchan/deps/base64-arraybuffer/index.js");

