const process = require('process')
const request = require('../src/utils').customHeaderRequest
const createClient = require('../src/utils').createClient

const AUTH_ENDPOINT = 'https://eventzimmer.eu.auth0.com/oauth/token'

exports.command = 'request_token'

exports.describe = 'Requests a token from the OAuth API'

exports.handler = function () {
  if (process.env.CLIENT_ID && process.env.CLIENT_SECRET) {
    try {
      request.post({
        url: AUTH_ENDPOINT,
        json: {
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          audience: 'api.eventzimmer.de',
          grant_type: 'client_credentials'
        }
      }, (err, response, body) => {
        if (err) {
          throw err
        } else {
          let token = body.access_token

          let client = createClient()
          client.set('access_token', token, 'EX', 35000, (err, result) => {
            if (err) {
              throw (err)
            } else {
              global.logger.info('Fetched access token.')
              process.exit()
            }
          })
        }
      })
    } catch (err) {
      global.logger.error(err)
    }
  } else {
    global.logger.warn('CLIENT_ID or CLIENT_SECRET not specified!')
  }
}
