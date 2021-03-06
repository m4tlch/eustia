import * as async from 'async'
import * as fs from 'fs'
import * as handlebars from 'handlebars'
import * as path from 'path'
import logger from './logger'

const tpl = {}

function readTpl(tplName) {
  const tplPath = path.resolve(__dirname, '../../tpl/' + tplName + '.hbs')

  return function(cb) {
    logger.debug('Read tpl', tplPath)

    fs.readFile(tplPath, 'utf8', function(err, data) {
      if (err) {
        return cb(err)
      }

      tpl[tplName] = handlebars.compile(data, { noEscape: true })

      cb()
    })
  }
}

export default function(templates, cb) {
  const callbacks = templates.map(function(val) {
    return readTpl(val)
  })

  async.parallel(callbacks, function(err) {
    if (err) {
      return cb(err)
    }

    cb(null, tpl)
  })
}
