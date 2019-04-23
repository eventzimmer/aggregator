const process = require('process')
const { promisify } = require('util')
const request = require('./utils').customHeaderRequest
const { createClient } = require('./utils')

const ENDPOINT_URL = (process.env.ENDPOINT_URL !== undefined) ? process.env.ENDPOINT_URL : 'http://localhost:8080/v1'

/**
 * Submits a list of events to the API server using credentials.
 * @function
 * @param {Array<Object>} events
 * @return {Promise<any>}
 */
function createEvents (events) {
  return new Promise((resolve, reject) => {
    const client = createClient()
    const getAsync = promisify(client.get).bind(client)
    getAsync('access_token').then((response) => {
      return Promise.resolve((response === null) ? 'testToken' : response)
    }).then((token) => {
      return request.post(`${ENDPOINT_URL}/events`, {
        auth: {
          bearer: token
        },
        method: 'POST',
        body: JSON.stringify(events),
        headers: { 'Content-Type': 'application/json' },
        resolveWithFullResponse: true
      })
    }).then((response) => {
      client.quit()
      if (response.statusCode === 201) {
        resolve(response.body)
      } else {
        reject(response.body)
      }
    }).catch((err) => {
      client.quit()
      reject(err)
    })
  })
}

exports.createEvents = createEvents
