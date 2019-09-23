const process = require('process')
const { promisify } = require('util')
const request = require('./utils').customHeaderRequest
const { createClient, ENDPOINT_URL } = require('./utils')

const AUTH_ENDPOINT = 'https://eventzimmer.eu.auth0.com/oauth/token'

/**
 * Submits a list of events to the API server using credentials.
 * @function
 * @param {Array<Object>} events
 * @return {Promise<any>}
 */
async function createEvents (events) {
  const client = createClient()
  const getAsync = promisify(client.get).bind(client)
  const token = await getAsync('access_token')
  client.quit()
  const response = await request.post(`${ENDPOINT_URL}/events`, {
    auth: {
      bearer: token
    },
    method: 'POST',
    body: JSON.stringify(events),
    headers: { 'Content-Type': 'application/json' },
    resolveWithFullResponse: true
  })
  if (response.statusCode === 201) {
    return response.body
  } else {
    throw new Error(response.body)
  }
}

exports.createEvents = createEvents

/**
 * Requests a token from the API and
 * NOTE: Make sure that CLIENT_ID and CLIENT_SECRET are set as environment variables.
 * @function
 * @return {Promise<string> | Promise<null>}
 */
async function requestToken () {
  if (process.env.CLIENT_ID && process.env.CLIENT_SECRET) {
    const response = await request.post({
      url: AUTH_ENDPOINT,
      json: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        audience: 'api.eventzimmer.de',
        grant_type: 'client_credentials'
      }
    })
    if (response.status === 200) {
      const client = createClient()
      const setAsync = promisify(client.set).bind(client)
      await setAsync(response.body.access_token)
      client.quit()
    } else {
      throw new Error(response.statusText)
    }
  } else {
    throw new Error('CLIENT_ID or CLIENT_SECRET not specified!')
  }
}

exports.requestToken = requestToken
