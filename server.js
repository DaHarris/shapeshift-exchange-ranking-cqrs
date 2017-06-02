const express = require('express')
const router = express.Router()
const bodyParser = require('body-parser')
const app = express()

// Configuration Setup
const config = require('shapeshift-common-library')('shapeshift-exchange-ranking-cqrs')
const port = config.get('port')
const redisConfig = config.get('redis')

// Redis connection setup
require('./database/redisSetup').setup(redisConfig)

// RabbitMQ connection setup
const rabbotWrapper = require('rabbitmq-wrapper')
const rabbotConfig = config.get('rabbitMQ')
rabbotWrapper.setQ_Subscription('queue.exchangeRankingHandler')

// Rabbot Handlers
const rankings = require('./middleware/rankings')
rabbotWrapper.setHandler('event.externalAPI.exchangeUpdated', rankings.updateExchanges)

// // Routes
// const exchange = require('./middleware/exchange')
// router.route('/').get(exchange.getExchangeRates)

// Final Express setup
app.use(bodyParser.json())
app.use('/rankings', router)
app.listen(port, () => { console.log('Listening on port: ' + port) })

// Final RabbitMQ setup
rabbotWrapper.setupClient('exchangeRankings', rabbotConfig)
