const healthCheckInterval = 1500
const healthCheckTimeout = 500

class ProcessMonitoring {
  /**
   * @param {TequilapiClient} tequilApi
   */
  constructor (tequilApi) {
    this.api = tequilApi
    this.clientIsRunning = false
    this.apiTimeout = null
    this.ipcTimeout = null
  }

  start () {
    this._healthCheck()
  }

  stop () {
    if (this.apiTimeout) {
      clearTimeout(this.apiTimeout)
    }
    if (this.ipcTimeout) {
      clearTimeout(this.ipcTimeout)
    }
  }

  isRunning () {
    return this.clientIsRunning
  }

  onProcessReady (callback) {
    const interval = setInterval(() => {
      if (this.clientIsRunning) {
        clearInterval(interval)
        callback()
      }
    }, 100)
  }

  async _healthCheck () {
    try {
      await this.api.healthCheck(healthCheckTimeout)
      this.clientIsRunning = true
    } catch (e) {
      this.clientIsRunning = false
    }

    this.apiTimeout = setTimeout(() => {
      this._healthCheck()
    }, healthCheckInterval)
  }
}

export default ProcessMonitoring
