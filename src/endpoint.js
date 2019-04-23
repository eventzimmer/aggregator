const process = require('process')
const request = require('./utils').customHeaderRequest
const createClient = require('./utils').createClient

const ENDPOINT_URL = (process.env.ENDPOINT_URL !== undefined) ? process.env.ENDPOINT_URL : 'http://localhost:8080/v1'

/**
 * Submits a list of events to the API server using credentials.
 * @function
 * @param {Array<Object>} events
 * @return {Promise<any>}
 */
function createEvents (events) {
  return new Promise((resolve, reject) => {
    let client = createClient()
    client.get('access_token', (err, response) => {
      if (err !== null) {
        reject(err)
      } else {
        if (response === null) { // Assume that we're in local mode.
          response = 'testToken'
        }

        request(`${ENDPOINT_URL}/events`, {
          auth: {
            bearer: response
          },
          method: 'POST',
          body: JSON.stringify(events),
          headers: { 'Content-Type': 'application/json' }
        }, (err, response, body) => {
          if (err) {
            reject(err)
          } else {
            if (response.statusCode === 201) {
              client.quit()
              resolve(body)
            } else {
              reject(body)
            }
          }
        })
      }
    })
  })
}

exports.createEvents = createEvents
