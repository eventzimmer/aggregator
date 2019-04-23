const { currentSource } = require('../src/sources')

exports.command = 'fetch_source'

exports.describe = 'Fetches the latest source.'

exports.handler = function () {
  currentSource().then((source) => {
    global.logger.info(source)
  }).catch((err) => {
    global.logger.error(err)
  })
}
