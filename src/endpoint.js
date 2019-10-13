const process = require('process')
const request = require('./utils').customHeaderRequest
const { ENDPOINT_URL } = require('./utils')

const AUTH_ENDPOINT = (process.env.AUTH_ENDPOINT !== undefined) ? process.env.AUTH_ENDPOINT : 'https://eventzimmer-staging.eu.auth0.com/oauth/token'

/**
 * Submits a list of events to the API server using credentials.
 * @function
 * @param {Array<Object>} events
 * @param {Object} client
 * @return {Promise<any>}
 */
async function createEvents (events, client) {
  const token = await client.get('access_token')
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
 * Submits a list events to the proposed_events table
 * @param events
 * @param client
 * @return {Promise<*>}
 */
async function proposeEvents (events, client) {
  const token = await client.get('access_token')
  const response = await request.post(`${ENDPOINT_URL}/proposed_events`, {
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

exports.proposeEvents = proposeEvents

/**
 * Requests a token from the API and
 * @function
 * @return {Promise<string> | Promise<null>}
 */
async function requestToken () {
  const response = await request.post({
    url: AUTH_ENDPOINT,
    json: {
      client_id: process.env.CLIENT_ID || 'hZxa9p8DN77eAlx5ZDAwH7EuRsvAGXRJ',
      client_secret: process.env.CLIENT_SECRET || 'wLujykWeQBLTDanebhDlMsjyMj6O91BTMbbADPQWbk0hdkeQ3H9DyZ2u7t2FgFJQ',
      audience: 'api.eventzimmer.de',
      grant_type: 'client_credentials'
    }
  })
  return response.access_token
}

exports.requestToken = requestToken
