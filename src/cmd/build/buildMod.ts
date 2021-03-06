import * as fs from 'fs-extra'
import { resolve } from 'path'
import * as request from 'request-promise'
import logger from '../../lib/logger'
import * as util from '../../lib/util'

const regDependency = /\s*\b_\(\s*['"]([\w\s$]+)['"]\s*\);?/m
const regExports = /\bexports\b/

export default async function(modName, codeTpl, options) {
  const fnPercentage = options.data.fnPercentage
  let percentage

  if (util.has(fnPercentage, modName)) {
    percentage = fnPercentage[modName]
  }

  percentage = percentage ? ' (' + percentage + ')' : ''

  const result: any = {}
  const paths: string[] = []

  util.each(options.libPaths, function(libPath) {
    if (util.isFn(libPath)) {
      libPath = libPath(modName)
    }
    util.each(options.extension, function(extension) {
      let path
      if (util.isUrl(libPath)) {
        path = libPath + modName + '.' + extension
      } else {
        path = resolve(libPath, modName + '.' + extension)
      }
      paths.push(path)
    })
  })

  let data: any
  let path

  for (let i = 0, len = paths.length; i < len; i++) {
    path = paths[i]
    if (util.isUrl(path)) {
      logger.tpl(
        {
          modName,
          path
        },
        'DOWNLOAD {{#cyan}}{{{modName}}}{{/cyan}} FROM {{{path}}}'
      )
      try {
        const reqOpts: any = {}
        if (options.proxy) {
          reqOpts.proxy = options.proxy
        }
        data = await request.get(path, reqOpts)
        await fs.mkdirp(options.cacheDir)
        await fs.writeFile(
          resolve(options.cacheDir, path.split('/').pop()),
          data,
          'utf8'
        )
        break
      } catch (e) {
        logger.tpl(
          {
            modName,
            path
          },
          'DOWNLOAD {{#cyan}}{{{modName}}}{{/cyan}} FROM {{{path}}} FAILED!'
        )
      }
    } else if (await fs.pathExists(path)) {
      data = await fs.readFile(path, options.encoding)
      break
    }
  }

  if (!data) {
    throw new Error('There is no module named "' + modName + '"')
  }

  data = transData(path, data, modName, options)

  let dependencies: any[] = regDependency.exec(data)
  dependencies = dependencies ? util.trim(dependencies[1]).split(/\s+/) : []

  data = util.indent(
    data.replace(regDependency, '\n\n/* dependencies\n * $1 \n */')
  )
  if (options.ts) {
    result.ts = extractTs(data)
  }
  if (options.removeComments) {
    data = util.stripCmt(data)
  }
  data = codeTpl({
    name: modName,
    code: util.trim(data),
    es: options.format === 'es',
    hasExports: regExports.test(data)
  })

  result.dependencies = dependencies
  result.name = modName
  result.code = data

  logger.tpl(
    {
      modName,
      percentage,
      dependencies: util.isEmpty(dependencies)
        ? ''
        : ' <= ' + dependencies.join(' ')
    },
    'BUILD MODULE {{#cyan}}{{{modName}}}{{/cyan}}{{{dependencies}}}{{{percentage}}}'
  )

  return result
}

function transData(filePath, src, modName, options) {
  const transpiler = options.transpiler

  util.each(transpiler, function(item) {
    if (item.exclude && item.exclude.test(filePath)) {
      return
    }

    if (item.test.test(filePath)) {
      util.each(item.handler, function(handler) {
        src = handler.call(item, src, modName)
      })
    }
  })

  return src
}

function extractTs(code: string) {
  let ret = ''

  const comments = util.extractBlockCmts(code)

  util.each(comments, function(comment) {
    const lines = util.trim(comment).split('\n')
    if (util.trim(lines[0]) !== 'typescript') {
      return
    }
    lines.shift()
    ret = indentOneSpace(lines.join('\n'))
  })

  return ret
}

const regStartOneSpace = /^ /gm

function indentOneSpace(data) {
  return data.replace(regStartOneSpace, '')
}
