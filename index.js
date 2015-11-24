var browserify = require('browserify')
var tools = require('browserify-transform-tools')
var resolve = require('require-resolve')
var fs = require('fs')
var stringify = require('json-stable-stringify')
var p = require('path')
var _ = require('lodash')

var memoize = require('memoize-async')

var bundle = memoize(function (ipfs, path, cb) {

  var relPath = '/' + p.relative(process.cwd(), path)
  var selfLinks = {}
  selfLinks[relPath] = "__IPO_SELF"

  // for each required module, insert a self-link

  var selfLink = tools.makeRequireTransform(
    'ipfs-self-links', {},
    function (args, opts, cb) {
      var dirname = p.dirname(opts.file)
      var resolved = resolve(args[0], dirname)
      var src

      if (resolved) {
        src = resolved.src
      } else {
        src = p.resolve(dirname, args[0])
      }

      var rel = '/' + p.relative(process.cwd(), src)
      var data = fs.readFileSync(src).toString()

      if (data.match(/__filename/)) {
        bundle(ipfs, src, function (err, res) {
          selfLinks[rel] = res
          cb(null, 'require(\'' + args[0] + '\')')
        })
      } else {
        cb(null, 'require(\'' + args[0] + '\')')
      }
    })

  var b = browserify([path], { standalone: 'bundle' })
    .transform(selfLink)
    .exclude('buffer')
    .bundle(function (err, res) {
      if (err) throw err
      var data = res.toString()
      _.map(selfLinks, function (val, key) {
        data = data.replace("\"" + key + "\"", stringify(val))
      })
      // console.log(data)
      ipfs.add(new Buffer(data), function (err, res) {
        if (err) return cb(err)
        ipfs.object.stat(res[0].Hash, function (err, stat) {
          cb(null, { Hash: stat.Hash,
                     Size: stat.CumulativeSize })
        })
      })
    })
}, function (ipfs, path) {
  return path
})

module.exports = bundle
