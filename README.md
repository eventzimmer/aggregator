eventzimmer aggregator
----------------------
[![Build Status](https://travis-ci.org/eventzimmer/aggregator.svg?branch=master)](https://travis-ci.org/eventzimmer/api)

# Overview

Aggregator is an aggregation server on top of the [bull](https://github.com/OptimalBits/bull) library.

A high level overview of the queues can be found in the diagram below:

![aggregator process](./docs/aggregator.svg "aggregator process")

To aggregate info we use [puppeteer](https://github.com/GoogleChrome/puppeteer) and [request](https://github.com/request/request).
