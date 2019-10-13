const request = require('../src/utils').customHeaderRequest

/**
 * Loads an RSS source
 * @function
 * @param url
 * @return {Promise<String>}
 */
function loadFromSource (url) {
  return request(url)
}

exports.loadFromSource = loadFromSource

/**
 * @function
 * @param {String} source
 */
async function transFormToEventList (source) {
  return null
}

exports.transFormToEventList = transFormToEventList

/**
 * @function
 */
async function transFormToEvent (source) {
  return null
}

exports.transFormToEvent = transFormToEvent
