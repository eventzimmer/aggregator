/*
 * The src/utils documents the general design of the aggregator module
 * All aggregator's implement the following three methods
 *
 * - load_from_source ( uri )
 *  This method is used as the entry point into aggregator.
 *  This can be an actual URL or an URI that points to a file.
 * - transformToEventList ( Object )
 *  The object returned from load_from_source is transformed to a list of possible events
 *  This may or may not include the full metadata already, depending on the aggregator
 * - transformToEvent ( Object )
 *  Takes a single object from an EventList and returns an Event from it.
 *  Whether or not this needs additional calls to the network (e.g Facebook) is up to the aggregator
 *
 *  Once a list of event objects is returned it is then processed by a geocoder to replace address with latitude / longitude.
 *  After this, the final step is to add events to the API
 */
const process = require('process')
const request = require('request-promise-native')

// NOTE: See https://stackoverflow.com/questions/38073527/request-how-to-set-user-agent-for-every-request/38074818#38074818
const customHeaderRequest = request.defaults({
  headers: {
    'User-Agent': 'Aggregator (https://github.com/eventzimmer/aggregator)'
  }
})

exports.customHeaderRequest = customHeaderRequest

/**
 * Where to find
 * @type {string}
 */
const ENDPOINT_URL = (process.env.ENDPOINT_URL !== undefined) ? process.env.ENDPOINT_URL : 'http://localhost:3000'
exports.ENDPOINT_URL = ENDPOINT_URL

/**
 * Where to find the locations JSON
 * @type {string}
 */
exports.LOCATIONS_URL = `${ENDPOINT_URL}/locations`

/**
 * Where to find the sources JSON
 * @type {string}
 */
exports.SOURCES_URL = `${ENDPOINT_URL}/sources`
