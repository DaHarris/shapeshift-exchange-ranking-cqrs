const redis = require('redis')
let client

const setup = (config) => {
  client = redis.createClient(config.port, config.host)
  client.on('connect', () => {
    console.log('Exchange ranking cache redis connected: ' + client.address)
  })

  client.on('error', (err) => {
    console.log('There was a redis error: ' + err)
    client.quit()
  })
}

const get = () => {
  return client
}

module.exports = {
  setup: setup,
  get: get
}
