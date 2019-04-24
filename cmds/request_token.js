const { requestToken } = require('../src/endpoint')

exports.command = 'request_token'

exports.describe = 'Requests a token from the OAuth API'

exports.handler = function () {
  if (process.env.CLIENT_ID && process.env.CLIENT_SECRET) {
    requestToken().then(() => {
      global.logger.info(`Successfully updated the access token.`)
    }).catch((err) => {
      global.logger.error(err)
    })
  } else {
    global.logger.warn('CLIENT_ID or CLIENT_SECRET not specified!')
  }
}
