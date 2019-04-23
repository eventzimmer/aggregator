const request = require('../src/utils').customHeaderRequest
const iCal = require('ical.js')

/**
 * Loads an iCalendar source
 * @function
 * @param url
 * @return {Promise<String>}
 */
function loadFromSource (url) {
  return new Promise((resolve, reject) => {
    request.get(url, function (err, responseText) {
      if (err) {
        reject(err)
      }
      resolve(responseText)
    })
  })
}

exports.loadFromSource = loadFromSource

/**
 * Takes a string and returns a list of components
 * @function
 * @param {String} source
 * @see {@link http://mozilla-comm.github.io/ical.js/api/ICAL.Component.html}
 * @return {Promise<Array<ICAL.Component>>}
 */
function transFormToEventList (source) {
  return new Promise((resolve, reject) => {
    try {
      let vData = iCal.parse(source)
      let calendar = new iCal.Component(vData)
      resolve(calendar.getAllSubcomponents())
    } catch (err) {
      reject(err)
    }
  })
}

exports.transFormToEventList = transFormToEventList

/**
 * Takes a VEVENT object and returns an event
 * @function
 * @param {ICAL.Component} source
 * @return {Promise<Object>}
 */
function transFormToEvent (source) {
  return new Promise((resolve, reject) => {
    let event = new iCal.Event(source)
    let parentOrganizer = event.component.parent.getFirstPropertyValue('x-wr-calname')

    resolve({
      name: event.summary,
      description: event.description,
      date: event.startDate.toJSDate(),
      location: (event.location !== null) ? event.location : parentOrganizer,
      url: event.component.getFirstPropertyValue('url'),
      images: (event.component.hasProperty('attach')) ? [event.component.getFirstPropertyValue('attach')].join(';') : ''
    })
  })
}

exports.transFormToEvent = transFormToEvent
