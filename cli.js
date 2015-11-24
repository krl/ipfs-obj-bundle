#! /usr/bin/env node
var bundle = require('./index.js')
var argv = require('minimist')(process.argv.slice(2))
var async = require('async')
var ipfsApi = require('ipfs-api')
var ipfs = ipfsApi(argv.host || argv.h || 'localhost',
                   argv.port || argv.p || 5001)

async.reduce(argv._, null, function (dmy, file, cb) {
  bundle(ipfs, file, function (err, res) {
    if (err) throw err
    console.log(file + ': ' + res.Hash)
  })
}, function () {})
