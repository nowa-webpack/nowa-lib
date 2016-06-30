/*
* @Author: gbk <ck0123456@gmail.com>
* @Date:   2016-04-21 17:34:00
* @Last Modified by:   gbk
* @Last Modified time: 2016-06-30 15:35:18
*/

'use strict';

var fs = require('fs');
var os = require('os');
var spawn = require('child_process').spawn;

var webpack = require('webpack');
var UglifyJs = require('uglify-js');
var CleanCss = require('clean-css');

var pkg = require('../package.json');
var util = require('./util');

// plugin defination
module.exports = {

  description: pkg.description,

  options: [
    [ '-s, --src <dir>', 'source directory, default to `src`', 'src' ],
    [ '-d, --dist <dir>', 'build directory, default to `dist`', 'dist' ],
    [ '-o, --loose', 'use babel es2015 loose mode to transform codes' ],
    [ '-c, --keepconsole', 'keep `console.log`' ],
    [ '    --skipminify', 'skip minify js and css' ],
    [ '-p, --progress', 'show progress' ],
    [ '-l, --libraries', 'libraries builder config' ],
    [ '    --skipinstall', 'skip npm install' ],
    [ '-n, --npm [npm]', 'which npm to use(like npm|cnpm|tnpm)', 'npm' ]
  ],

  action: function(options) {

    // options
    var src = options.src;
    var dist = options.dist;
    var loose = options.loose;
    var keepconsole = options.keepconsole;
    var skipminify = options.skipminify;
    var progress = options.progress;
    var libraries = options.libraries;
    var skipinstall = options.skipinstall;
    var npm = options.npm;

    // libraries is required
    if (!libraries) {
      console.error('No `libraries` config found in `abc.json`');
      return;
    }

    // enable es2015 loose mode
    if (loose) {

      // modify es2015 presets, add `loose: true` option
      var es2015Plugins = require(util.babel('preset', 'es2015')).plugins;
      for (var i = 0; i < es2015Plugins.length; i++) {
        if (Array.isArray(es2015Plugins[i])) {
          es2015Plugins[i][1].loose = true;
        } else {
          es2015Plugins[i] = [
            es2015Plugins[i],
            { loose: true }
          ];
        }
      }
    }

    // parse rules and generate entry
    var entries = {};
    var command = [];
    var hasEntry = false;
    for (var key in libraries) {
      var lib = libraries[key];
      var name = lib.output.replace(/\.js$/, '');
      var srcFile = entries[name] = './lib__' + name + '.js';
      var srcContent = [ 'window["' + key + '"]={' ];
      for (var comp in lib.mappings) {
        var dep = lib.mappings[comp];
        command.push(dep);
        if (/^@ali\//.test(dep)) {
          dep = dep.split('@').slice(0, 2).join('@');
        } else {
          dep = dep.split('@')[0];
        }
        srcContent.push('"' + comp + '":require("' + dep + '"),');
      }
      srcContent.push('};');
      fs.writeFileSync(srcFile, srcContent.join('\n'));
      hasEntry = true;
    }
    if (!hasEntry) {
      return;
    }

    // install deps
    console.log('Installing dependencies of libraries...');
    spawn(process.platform === 'win32' ? npm + '.cmd' : npm, skipinstall ? [ '-v' ] : [
      'install',
      '-d'
    ].concat(command), {
      stdio: 'inherit',
      stderr: 'inherit'
    }).on('exit', function(code) {
      if (code !== 0) {
        console.error('install error');
      }

      // build libraries
      console.log('Building libraries...');
      webpack({
        entry: entries,
        output: {
          path: util.cwdPath(dist),
          filename: '[name].js'
        },
        plugins: [
          new webpack.SourceMapDevToolPlugin({
            columns: false
          }),
          new webpack.optimize.DedupePlugin()
        ],
        resolveLoader: {
          root: [
            util.relPath('..', 'node_modules'),
            util.relPath('..', '..')
          ]
        },
        externals: {
          'react': 'window.React',
          'react-dom': 'window.ReactDOM || window.React'
        },
        module: {
          loaders: [
            {
              test: /\.jsx?$/,
              loader: 'babel',
              exclude: function (path) { // only uxcore and tingle need transform code
                var isNpmModule = !!path.match(/node_modules/);
                var isLib = !!path.match(/node_modules[\/\\](@ali[\/\\])?tingle/);
                return isNpmModule && !isLib;
              },
              query: {
                plugins: util.babel('plugin', [
                  'add-module-exports',
                  'transform-es3-member-expression-literals',
                  'transform-es3-property-literals'
                ]),
                presets: util.babel('preset', [
                  'es2015',
                  'stage-0',
                  'react'
                ]),
                cacheDirectory: os.tmpdir()
              }
            }
          ]
        }
      }, function(err, stats) {
        if(err) {
          console.error(err);
        }

        // clean
        for (var key in entries) {
          try {
            fs.unlinkSync(entries[key]);
          } catch (e) {
          }
        }

        console.log(stats.toString({
          version: false,
          hash: false,
          chunks: false,
          children: false
        }));
        stats.toJson({
          hash: false,
          chunks: false,
          children: false,
          modules: false
        }).assets.forEach(function(n) {

          // minify
          var file = util.cwdPath(dist, n.name);
          var minFile = file.replace(/.js$/, '.min.js').replace(/.css$/, '.min.css');
          if (/\.js$/.test(file)) {
            console.log('Minify file: ' + file);
            var result = UglifyJs.minify(file, {
              compress: {
                warnings: false,
                drop_console: !keepconsole
              },
              comments: false
            });
            fs.writeFileSync(minFile, result.code);
          } else if (/\.css$/.test(file)) {
            console.log('Minify file: ' + file);
            var result = new CleanCss({
              keepSpecialComments: 0,
              compatibility: true,
              advanced: false,
              processImport: true
            }).minify(fs.readFileSync(file, 'utf-8'));
            fs.writeFileSync(minFile, result.styles);
          }

          // copy to lib dir
          try {
            fs.mkdirSync(util.cwdPath(src, 'lib'));
          } catch (e) {
          }
          try {
            var libFile = util.cwdPath(src, 'lib', n.name);
            var libMinFile = libFile.replace(/.js$/, '.min.js').replace(/.css$/, '.min.css');
            fs.writeFileSync(libFile, fs.readFileSync(file));
            fs.writeFileSync(libMinFile, fs.readFileSync(minFile));
          } catch (e) {
          }
        });
      });
    });
  }
};
