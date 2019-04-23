const process = require('process')
const { promisify } = require('util')
const request = require('../src/utils').customHeaderRequest
const { createClient } = require('../src/utils')

const AUTH_ENDPOINT = 'https://eventzimmer.eu.auth0.com/oauth/token'

exports.command = 'request_token'

exports.describe = 'Requests a token from the OAuth API'

exports.handler = function () {
  if (process.env.CLIENT_ID && process.env.CLIENT_SECRET) {
    const client = createClient()
    const setAsync = promisify(client.set).bind(client)

    request.post({
      url: AUTH_ENDPOINT,
      json: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        audience: 'api.eventzimmer.de',
        grant_type: 'client_credentials'
      }
    }).then((body) => {
      const token = body.access_token
      return setAsync('access_token', token, 'EX', 35000)
    })
      .then(() => {
        global.logger.info('Successfully updated access token.')
        client.quit()
      })
      .catch((err) => {
        global.logger.error(err)
        client.quit()
      })
  } else {
    global.logger.warn('CLIENT_ID or CLIENT_SECRET not specified!')
  }
}
