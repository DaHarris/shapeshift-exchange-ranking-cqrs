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

// Routes
router.route('/').get(rankings.getExchangeRankings)

// Final Express setup
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  next()
})
app.use(bodyParser.json())
app.use('/rankings', router)
app.listen(port, () => { console.log('Listening on port: ' + port) })

// Final RabbitMQ setup
rabbotWrapper.setupClient('exchangeRankings', rabbotConfig)
