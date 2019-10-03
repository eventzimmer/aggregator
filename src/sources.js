const { SOURCES_URL, customHeaderRequest } = require('./utils')

/**
 * Returns the latest source from redis.
 * Populates the "sources" key in redis with a new list of sources if it is empty.
 * @function
 * @param {Object} client
 * @return {Promise<Object>}
 */
async function currentSource (client) {
  const response = await client.llen('sources')
  if (response === 0) {
    let sources = await customHeaderRequest({
      url: SOURCES_URL,
      json: true
    })
    await client.lpush('sources', ...sources.map((s) => JSON.stringify(s)))
  }
  return client.lpop('sources')
}

exports.currentSource = currentSource
