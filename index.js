// node builtins
const qs = require('querystring')
const url = require('url')

// npm modules
const fetch = require('isomorphic-unfetch')

const ICLOUD_ACCOUNT_URI = 'https://setup.icloud.com/setup/ws/1/accountLogin'

class Cloud {
  constructor ({ appleId, password }) {
    Object.assign(this, { appleId, password })

    this.user = null
    this.services = {}

    this.cookies = []
  }

  async login () {
    if (this.user) {
      return this.user
    }

    const accountResponse = await fetch(ICLOUD_ACCOUNT_URI, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ apple_id: this.appleId, password: this.password, extended_login: false })
    })

    if (accountResponse.status !== 200) {
      const text = await accountResponse.text()
      throw new Error(`Response ${accountResponse.status}: ${text}`)
    }

    const {
      dsInfo: user,
      webservices: services
    } = await accountResponse.json()

    this.user = user
    this.services = services
    this.cookies = accountResponse.headers.get('set-cookie').replace(/(Secure|HttpOnly),/gi, '$1;')

    return this.user
  }

  /*
   * returns object with incomplete reminders and collections
   */
  async reminders () {
    if (!this.user) {
      await this.login()
    }

    const { reminders: service } = this.services

    if (!service) {
      throw new Error('This iCloud account does not support reminders')
    }

    // create helper for this formatting
    const serviceUrl = url.parse(service.url)
    serviceUrl.pathname = '/rd/startup'
    serviceUrl.search = this.params()
    delete serviceUrl.host
    delete serviceUrl.port

    const response = await fetch(url.format(serviceUrl), {
      headers: this.headers()
    })

    try {
      const { Collections, Reminders } = await response.clone().json()
      return {
        collections: Collections,
        reminders: Reminders
      }
    } catch (_) {
      const text = await response.text()
      throw new Error(`Response ${response.status}: ${text}`)
    }
  }
    } catch (_) {
      const text = await response.text()
      throw new Error(`Response ${response.status}: ${text}`)
    }
  }

  headers (custom = {}) {
    return {
      ...custom,
      origin: 'https://www.icloud.com',
      cookie: this.cookies,
      'Content-Type': 'application/json'
    }
  }

  params (custom = {}) {
    return qs.stringify({
      ...custom,
      lang: 'en-us',
      usertz: 'America/New_York',
      dsid: this.user.dsid
    })
  }
}

module.exports = Cloud
