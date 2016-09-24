/*
* @Author: gbk
* @Date:   2016-05-17 17:49:43
* @Last Modified by:   gbk
* @Last Modified time: 2016-09-23 14:13:19
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
  }
};

module.exports = util;
