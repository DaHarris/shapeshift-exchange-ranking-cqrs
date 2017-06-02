const Rankings = require('../lib/rankings')
const rabbotWrapper = require('rabbitmq-wrapper')

const updateExchanges = function (msg) {
  try {
    let exchange = msg.body.exchange
    let tickers = msg.body.tickers
    let timeStamp = msg.body.timeStamp
    Rankings.updateManager(exchange, tickers, timeStamp, function (err, results) {
      if (err) {
        console.log(err)
        rabbotWrapper.disposeMsg(msg, err)
      } else {
        rabbotWrapper.disposeMsg(msg, null)
      }
    })
  } catch (err) {
    console.log(err)
    err.deadLetter = true
    rabbotWrapper.disposeMsg(msg, err)
  }
}

module.exports = {
  updateExchanges
}
