const request = require('../src/utils').customHeaderRequest
const { parse, Component, Event } = require('ical.js')
const slug = require('slug')

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
  return calendar.getAllSubcomponents()
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
  if (!event.component.hasProperty('url')) {
    const startDate = event.startDate.toJSDate()
    event.component.addPropertyWithValue('url', `https://eventzimmer.de/${startDate.toISOString().slice(0, 10)}/${slug(event.summary)}`)
  }
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
