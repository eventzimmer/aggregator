eventzimmer aggregator
----------------------
[![Build Status](https://travis-ci.org/eventzimmer/aggregator.svg?branch=master)](https://travis-ci.org/eventzimmer/aggregator)

# Overview

Aggregator is an aggregation server on top of the [bull](https://github.com/OptimalBits/bull) library.

A high level overview of the queues can be found in the diagram below:

![aggregator process](./docs/aggregator.svg "aggregator process")

To aggregate info we use [puppeteer](https://github.com/GoogleChrome/puppeteer) and [request](https://github.com/request/request).

## Getting started

To get a local version of `aggregator` you will need two things:

- a [working setup](https://github.com/eventzimmer/schema/blob/master/SETUP.md) of `schema`
- a [Redis](https://redis.io) server. I use `docker run -it --rm -p 6379:6378 redis` and it works like a charm

Once everything is in order, run:

```
git clone https://github.com/eventzimmer/aggregator.git
cd aggregator
npm install
CLIENT_ID=yourauth0id CLIENT_SECRET=yourauth0secret node worker.js # you can use the --inspect flag for remote debugging
```

This will fire up a `aggregator` instance. The commands in `cli` can be used to add new tasks to the queue, which is indeed helpful for debugging. 

### Configuration

Using below environment variables `aggregator` can be configured:

| environment variable | description                                           | default                                                          |
|----------------------|-------------------------------------------------------|------------------------------------------------------------------|
| REDIS_URL            | Where to find redis                                   | redis://localhost:6379/1                                         |
| ENDPOINT_URL         | Where to find the eventzimmer API                     | http://localhost:3000                                            |
| AUTH_ENDPOINT        | Where to obtain auth tokens                           | https://eventzimmer-staging.eu.auth0.com/oauth/token             |
| CLIENT_ID            | The client ID to use for JWT auth                     | hZxa9p8DN77eAlx5ZDAwH7EuRsvAGXRJ                                 |
| CLIENT_SECRET        | The client secret to use for JWT auth                 | wLujykWeQBLTDanebhDlMsjyMj6O91BTMbbADPQWbk0hdkeQ3H9DyZ2u7t2FgFJQ |
| HTTP_PROXY           | Whether to use a http proxy for Facebook aggregation  | -                                                                |
| HTTPS_PROXY          | Whether to use a https proxy for Facebook aggregation | -                                                                |
