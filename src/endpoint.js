const process = require('process')
const { promisify } = require('util')
const request = require('./utils').customHeaderRequest
const { createClient } = require('./utils')

const ENDPOINT_URL = (process.env.ENDPOINT_URL !== undefined) ? process.env.ENDPOINT_URL : 'http://localhost:8080/v1'
const AUTH_ENDPOINT = 'https://eventzimmer.eu.auth0.com/oauth/token'

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

/**
 * Requests a token from the API and
 * NOTE: Make sure that CLIENT_ID and CLIENT_SECRET are set as environment variables.
 * @function
 * @return {Promise<string> | Promise<null>}
 */
function requestToken() {
  if (process.env.CLIENT_ID && process.env.CLIENT_SECRET) {
    const client = createClient()
    const setAsync = promisify(client.set).bind(client)

    return request.post({
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
    }).then((status) => {
      client.quit()
      return Promise.resolve(status)
    }).catch((err) => {
      client.quit()
      return Promise.reject(err)
    })
  } else {
    return Promise.reject('CLIENT_ID or CLIENT_SECRET not specified!')
  }
}

exports.requestToken = requestToken
