const request = require('../src/utils').customHeaderRequest
const { parse, Component, Event } = require('ical.js')

/**
 * Loads an iCalendar source
 * @function
 * @param url
 * @return {Promise<String>}
 */
function loadFromSource (url) {
  return request(url)
}

exports.loadFromSource = loadFromSource

/**
 * Takes a string and returns a list of components
 * @function
 * @param {String} source
 * @see {@link http://mozilla-comm.github.io/ical.js/api/ICAL.Component.html}
 * @return {Promise<Array<Component>>}
 */
async function transFormToEventList (source) {
  let vData = parse(source)
  let calendar = new Component(vData)
  let prodid = calendar.getFirstPropertyValue('prodid')
  if (prodid.includes('Google Inc') && prodid.includes('Google Calendar')) { // Add missing event URL's to Google calendar
    let timezone = calendar.getFirstPropertyValue('x-wr-timezone')
    return calendar.getAllSubcomponents().map((component) => {
      let uid = component.getFirstPropertyValue('uid')
      component.addPropertyWithValue('url', `https://www.google.com/calendar/event?eid=${uid}&ctz=${timezone}`)
      return component
    })
  } else {
    return calendar.getAllSubcomponents()
  }
}

exports.transFormToEventList = transFormToEventList

/**
 * Takes a VEVENT object and returns an event
 * @function
 * @param {Component} source
 * @return {Promise<Object>}
 */
async function transFormToEvent (source) {
  let event = new Event(source)
  let parentOrganizer = event.component.parent.getFirstPropertyValue('x-wr-calname')
  return {
    name: event.summary,
    description: event.description,
    starts_at: event.startDate.toJSDate(),
    location: (event.location !== null) ? event.location : parentOrganizer,
    url: event.component.getFirstPropertyValue('url')
    // images: (event.component.hasProperty('attach')) ? [event.component.getFirstPropertyValue('attach')].join(';') : []
  }
}

exports.transFormToEvent = transFormToEvent
