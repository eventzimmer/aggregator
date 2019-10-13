const request = require('../src/utils').customHeaderRequest
const Parser = require('rss-parser');


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
  const parser = new Parser({
    customFields: {
      item: ['location'],
    }
  })
  const feed = await parser.parseString(source)
  return feed.items
}

exports.transFormToEventList = transFormToEventList

/**
 * @function
 */
async function transFormToEvent (item) {
  return {
    name: item.title,
    url: item.link.replace('//', 'https://'),
    starts_at: new Date(item.isoDate),
    description: item.contentSnippet,
    location: item.location
  }
}

exports.transFormToEvent = transFormToEvent
