const fs = require('fs')
const path = require('path')
const process = require('process')
const expect = require('chai').expect

const facebook = require('../src/facebook')
const NETWORK_TEST = (process.env.NETWORK_TEST !== undefined)
const TEST_URL = 'https://www.facebook.com/pg/BierkellerTuebingen/events/'

describe('facebook', function () {
  describe('loadFromSource', function () {
    it('Should load an edge list from a source', function (done) {
      if (!NETWORK_TEST) {
        this.skip()
      } else {
        this.timeout(30000) // this takes really long

        facebook.loadFromSource(TEST_URL).then((source) => {
          expect(source).to.be.a('array')
          done()
        }).catch((err) => {
          done(err)
        })
      }
    })
  })

  describe('transformToEventList', function () {
    it('Should transform the top10 object to a list of edges', function (done) {
      fs.readFile(path.join(process.cwd(), 'fixtures/top10_responses_sample.json'), (err, data) => {
        if (err) {
          done(err)
        }
        let fixtures = JSON.parse(data.toString())
        facebook.transFormToEventList(fixtures).then((events) => {
          expect(events).to.have.length(8)
          events.forEach((e) => {
            expect(e.id).to.be.a('string')
            expect(e.name).to.be.a('string')
            expect(e.url).to.be.a('string')
          })
          done()
        }).catch((err) => {
          done(err)
        })
      })
    })

    it('Should transform the Cafe Haag object to a list of edges', function (done) {
      fs.readFile(path.join(process.cwd(), 'fixtures/cafe_haag_responses.json'), (err, data) => {
        if (err) {
          done(err)
        }
        let fixtures = JSON.parse(data.toString())
        facebook.transFormToEventList(fixtures).then((events) => {
          expect(events).to.have.length(8)
          events.forEach((e) => {
            expect(e.id).to.be.a('string')
            expect(e.name).to.be.a('string')
            expect(e.url).to.be.a('string')
          })
          done()
        }).catch((err) => {
          done(err)
        })
      })
    })

    it('Should transform an API object to a list of edges', function (done) {
      fs.readFile(path.join(process.cwd(), 'fixtures/records.json'), (err, data) => {
        if (err) {
          done(err)
        }
        let fixtures = JSON.parse(data.toString())
        facebook.transFormToEventList(fixtures).then((events) => {
          expect(events).to.have.length(15)
          events.forEach((e) => {
            expect(e.id).to.be.a('string')
            expect(e.name).to.be.a('string')
            expect(e.url).to.be.a('string')
          })
          done()
        }).catch((err) => {
          done(err)
        })
      })
    })
  })

  describe('transFormToEventDetails', function () {
    it('Should transform a query object to event details', function (done) {
      const fixtures = require('../fixtures/records_event.json')
      facebook.transFormToEventDetails(fixtures).then((details) => {
        expect(details.description).to.be.a('string')
        expect(details.images).to.be.a('array')
        expect(details.images).to.have.length(1)
        done()
      }).catch((err) => {
        done(err)
      })
    })
  })

  describe('transformToEvent', function () {
    it('Should transform a edge object to an event', function (done) {
      const fixture = {
        'id': '2104044649828163',
        'time_range': {
          'start': '2018-05-19T22:00:00+0200'
        },
        'event_place': {
          'contextual_name': 'Bierkeller Tübingen',
          '__typename': 'Page',
          'city': {
            'contextual_name': 'Tübingen',
            'id': '110776595613900'
          },
          'id': '823159777764885',
          'name': 'Bierkeller Tübingen',
          'url': 'https://www.facebook.com/BierkellerTuebingen/'
        },
        'is_canceled': false,
        'name': 'Headbanger`s Metal Party - Bang your Head!!! Warm-up Party',
        'is_past': false
      }

      facebook.transFormToEvent(fixture).then((event) => {
        expect(event.name).to.equal('Headbanger`s Metal Party - Bang your Head!!! Warm-up Party')
        expect(event.url).to.be.a('string')
        expect(event.starts_at).to.be.a('date')
        expect(event.location).to.be.a('string')
        done()
      }).catch((err) => {
        done(err)
      })
    })
  })
})
