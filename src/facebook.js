const { recordResponses } = require('./puppeteer')
const GRAPHQL_URL = 'https://www.facebook.com/api/graphql/'
const EVENT_URL = 'https://facebook.com/events/'

/**
 * Sends a request to Facebook retrieving a list of events for the page
 * @param {String} url
 * @return {Promise<Object>}
 */
function loadFromSource (url) {
  return recordResponses(url)
}

exports.loadFromSource = loadFromSource

/**
 * Takes a JSON response from Facebook's API and turns it into a list of event ID's
 * @param {Object} source
 * @return {Promise<Array<object>>}
 */
async function transFormToEventList (source) {
  let edges = source.filter((s) => {
    return (s.url === GRAPHQL_URL)
  }).filter((s) => {
    return (s.data.data.page !== undefined)
  }).filter((s) => {
    return (s.data.data.page.upcoming_events || s.data.data.page.upcomingRecurringEvents)
  }).map((s) => {
    return (s.data.data.page.upcoming_events) ? s.data.data.page.upcoming_events.edges : s.data.data.page.upcomingRecurringEvents.edges
  }).reduce(function (a, b) {
    return a.concat(b)
  }, []).filter((e) => (typeof (e.node.time_range) !== 'undefined'))
  return edges.map((edge) => {
    return {
      id: edge.node.id,
      time_range: edge.node.time_range,
      event_place: edge.node.event_place,
      is_canceled: edge.node.is_canceled,
      name: edge.node.name,
      url: `${EVENT_URL}${edge.node.id}`,
      is_past: edge.node.is_past
    }
  })
}

exports.transFormToEventList = transFormToEventList

/**
 * Takes the combined graphql queries of a page and returns event details from it
 * @function
 * @param {object} source
 * @return {Promise<object>}
 */
async function transFormToEventDetails (source) {
  let queries = source.filter((s) => {
    return (s.url === GRAPHQL_URL)
  }).map((s) => {
    return s.data
  }).filter((body) => {
    return (body.data.event !== undefined)
  }).filter((body) => {
    return (body.data.event.details !== undefined)
  })
  return (queries.length) ? { description: queries.shift().data.event.details.text } : { description: '' }
}

exports.transFormToEventDetails = transFormToEventDetails

/**
 * Takes a edge object and returns an event
 * @function
 * @param {Object} data
 * @return {Promise<Object>}
 */
async function transFormToEvent (data) {
  return {
    name: data.name,
    starts_at: new Date(data.time_range.start),
    url: `${EVENT_URL}${data.id}`,
    location: data.event_place.name
  }
}

exports.transFormToEvent = transFormToEvent
