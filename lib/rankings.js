const Redis = require('../database/redisSetup').get()
const async = require('async')

// Configuration
const trackedCurrencies = ['BTC_LTC', 'BTC_ETH', 'BTC_DASH']

const updateManager = function (exchange, tickers, timeStamp, callback) {
  if (Redis.connected) {
    // Make sure the rabbitmq message is newer than the last received message
    updateAllowed(exchange, timeStamp, function (err, allowed) {
      if (err) {
        callback(err, null)
      } else if (allowed === true) {
        // Update the exchange's stored rates
        updateExchange(exchange, tickers, timeStamp, function (err, results) {
          if (err) {
            callback(err, null)
          } else {
            // Recalculate the lowest rates given the new exchange's rates
            setHighestExchangeRates(function (err, results) {
              if (err) {
                callback(err, null)
              } else {
                console.log('Successfully stored new lowest bitcoin exchange rates.')
                callback(null, results)
              }
            })
          }
        })
      } else if (allowed === false) {
        console.log('Received message to update exchange: ' + exchange + ' out of timeStamp order, acking message.')
        callback(null, true)
      }
    })
  } else {
    let newError = new Error('Redis is down')
    callback(newError, null)
  }
}

const updateAllowed = function (exchange, timeStamp, callback) {
  Redis.HMGET('exchanges', exchange, function (err, results) {
    if (err) {
      callback(err, null)
    } else if (JSON.parse(results[0] === null)) {
      callback(null, true)
    } else {
      let exchangeInfo = JSON.parse(results[0])
      let existingTimeStamp = exchangeInfo.timeStamp
      if (existingTimeStamp <= timeStamp) {
        callback(null, true)
      } else {
        callback(null, false)
      }
    }
  })
}

const updateExchange = function (exchange, tickers, timeStamp, callback) {
  let data = {
    timeStamp: timeStamp,
    tickers: tickers
  }
  Redis.HMSET('exchanges', exchange, JSON.stringify(data), function (err, results) {
    if (err) {
      callback(err, null)
    } else {
      console.log('Successfully updated exchange: ' + exchange)
      callback(null, results)
    }
  })
}

const setHighestExchangeRates = function (fullback) {
  Redis.HGETALL('exchanges', function (err, results) {
    if (err) {
      fullback(err, null)
    } else {
      let lowest = {}
      trackedCurrencies.map(function (currency) {
        lowest[currency] = {
          lowestExchange: null,
          lowestPrice: null
        }
      })
      let exchangeRates
      let price
      let filteredTickers
      let ticker
      let lowestPrice
      for (let exchange in results) {
        // Get each of the exchange's rates
        exchangeRates = JSON.parse(results[exchange])
        // Iterate through tracked currencies
        trackedCurrencies.map(function (currency) {
          // Find the currency value in the exchange's rates
          filteredTickers = exchangeRates.tickers.filter(function (rate) { return rate.symbol === currency })
          // If the currency is found in the exchange's rates, compare it to the lowest, else go to the next currency
          if (filteredTickers.length) {
            ticker = filteredTickers[0]
            price = ticker.ask
            lowestPrice = lowest[currency].lowestPrice
            // If the exchange's currency is the lowest recorded, or if no lowest exists yet (lowestPrice will be null)
            // save the exchange's rate as the lowest.
            if (lowestPrice === null || price < lowestPrice) {
              lowest[currency] = {
                lowestExchange: exchange,
                lowestPrice: price
              }
            }
          }
        })
      }
      // Iterate through the saved lowest rates and save them to the cache
      async.forEachOf(lowest, function (item, key, callback) {
        Redis.HMSET('lowestRates', key, JSON.stringify(item), function (err, results) {
          if (err) {
            callback(err, null)
          } else {
            callback(null, results)
          }
        })
      }, function (err) {
        if (err) {
          fullback(err, null)
        } else {
          fullback(null, true)
        }
      })
    }
  })
}

module.exports = {
  updateManager
}
