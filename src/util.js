/*
* @Author: gbk
* @Date:   2016-05-17 17:49:43
* @Last Modified by:   gbk
* @Last Modified time: 2017-04-26 10:33:52
*/

'use strict';

var path = require('path');

var util = {

  // get absolute path to cwd
  cwdPath: function() {
    var argvs = Array.prototype.slice.call(arguments);
    argvs.unshift(process.cwd());
    return path.join.apply(path, argvs);
  },

  // get absolute path to __dirname
  relPath: function(p) {
    var argvs = Array.prototype.slice.call(arguments);
    argvs.unshift(__dirname);
    return path.join.apply(path, argvs);
  },

  // make babel plugin/preset absolute path
  babel: function(type, name) {
    if (Array.isArray(name)) {
      return name.map(function(n) {
        return util.babel(type, n);
      });
    } else {
      if (typeof name === 'object') {
        return [
          require.resolve([
            'babel',
            type,
            name.name
          ].join('-')),
          name.options
        ];
      } else {
        return require.resolve([
          'babel',
          type,
          name
        ].join('-'));
      }
    }
  },

  // get npm registry
  getNpmRegistry: function(npm) {
    switch (npm) {
      case 'npm':
        return {
          cmd: 'npm',
          registry: 'https://registry.npmjs.org'
        };
      case 'cnpm':
        return {
          cmd: 'cnpm',
          registry: 'https://registry.npm.taobao.org'
        };
      case 'tnpm':
        return {
          cmd: 'tnpm',
          registry: 'http://registry.npm.alibaba-inc.com'
        };
      default:
        return {
          cmd: 'npm',
          registry: npm
        };
    }
}

};

module.exports = util;
