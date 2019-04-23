const puppeteer = require('./puppeteer')
const GRAPHQL_URL = 'https://www.facebook.com/api/graphql/'
const EVENT_URL = 'https://facebook.com/events/'
const SCONTENT_URL = 'https://scontent'

/**
 * Sends a request to Facebook retrieving a list of events for the page
 * @param {String} url
 * @return {Promise<Object>}
 */
function loadFromSource (url) {
  return puppeteer.recordResponses(url)
}

exports.loadFromSource = loadFromSource

/**
 * Takes a JSON response from Facebook's API and turns it into a list of event ID's
 * @param {Object} source
 * @return {Promise<Array<object>>}
 */
function transFormToEventList (source) {
  return new Promise((resolve) => {
    let edges = source.filter((s) => {
      return (s.url === GRAPHQL_URL)
    }).filter((s) => {
      return (s.data.data.page.upcoming_events || s.data.data.page.upcomingRecurringEvents)
    }).map((s) => {
      return (s.data.data.page.upcoming_events) ? s.data.data.page.upcoming_events.edges : s.data.data.page.upcomingRecurringEvents.edges
    }).reduce(function (a, b) {
      return a.concat(b)
    }, [])

    resolve(edges.map((edge) => {
      return {
        id: edge.node.id,
        time_range: edge.node.time_range,
        event_place: edge.node.event_place,
        is_canceled: edge.node.is_canceled,
        name: edge.node.name,
        url: `${EVENT_URL}${edge.node.id}`,
        is_past: edge.node.is_past
      }
    }))
  })
}

exports.transFormToEventList = transFormToEventList

/**
 * Takes the combined graphql queries of a page and returns event details from it
 * @function
 * @param {object} source
 * @return {Promise<object>}
 */
function transFormToEventDetails (source) {
  return new Promise((resolve, reject) => {
    let images = source.filter((s) => {
      return (s.url.startsWith(SCONTENT_URL))
    })

    let queries = source.filter((s) => {
      return (s.url === GRAPHQL_URL)
    }).map((s) => {
      return s.data
    }).filter((body) => {
      return (body.data.event !== undefined)
    }).filter((body) => {
      return (body.data.event.details !== undefined)
    })

    // Luckily enough the title image will always be loaded first because all the other images are affiliated links.
    // Thanks Facebook for making user friendly, easy-to-predict apps (:
    if (queries.length) {
      resolve({
        description: queries.shift().data.event.details.text,
        images: [images.shift().url]
      })
    } else {
      resolve({
        description: '',
        images: [images.shift().url]
      })
    }
  })
}

exports.transFormToEventDetails = transFormToEventDetails

/**
 * Takes a edge object and returns an event
 * @function
 * @param {Object} data
 * @return {Promise<EventType>}
 */
function transFormToEvent (data) {
  return new Promise((resolve) => {
    resolve({
      name: data.name,
      date: new Date(data.time_range.start),
      url: `${EVENT_URL}${data.id}`,
      location: data.event_place.name,
      city: data.event_place.city.contextual_name
    })
  })
}

exports.transFormToEvent = transFormToEvent
