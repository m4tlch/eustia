import * as fs from 'fs'
import * as path from 'path'
import build from './cmd/build'
import doc from './cmd/doc'
import help from './cmd/help'
import version from './cmd/version'
import logger from './lib/logger'
import * as util from './lib/util'

const cwd = process.cwd()
const defOpts = {
  cwd,
  dirname: path.resolve(__dirname, '../'),
  // Prepend to generated file to prevent being scanned again.
  magicNum: '// Built by eustia.',
  data: {},
  enableLog: false,
  debug: false,
  encoding: 'utf8',
  errLog: false,
  packInfo: require('../package.json')
}
const errLogPath = path.resolve(cwd, './eustia-debug.log')

module.exports = {
  build: cmdFactory(build),
  doc: cmdFactory(doc),
  help: cmdFactory(help),
  version: cmdFactory(version)
}

function cmdFactory(cmd) {
  return function(options, cb) {
    cb = cb || util.noop
    options = util.defaults(options, defOpts, cmd.defOpts || {})
    options.cacheDir = path.resolve(options.cwd, 'eustia/cache')

    if (options.enableLog) {
      logger.enable()
    }
    if (options.verbose) {
      logger.isDebug = true
    }

    logger.debug('Options', options)

    cmd(options, function(err) {
      if (err) {
        logger.error(err)
        if (options.errLog) {
          // Need to exit immediately, so async fs is not used.
          fs.writeFileSync(errLogPath, logger.history(), 'utf-8')
          process.exit()
        }
      }

      if (options.errLog) {
        fs.exists(errLogPath, function(result) {
          if (result) {
            fs.unlink(errLogPath, util.noop)
          }
        })
      }

      cb(err)
    })
  }
}
