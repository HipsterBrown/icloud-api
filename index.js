// node builtins
const readline = require('readline')
const qs = require('querystring')
const url = require('url')

// npm modules
const fetch = require('isomorphic-unfetch')

const ICLOUD_AUTH_SIGNIN = 'https://idmsa.apple.com/appleauth/auth/signin'
const ICLOUD_ACCOUNT_URI = 'https://setup.icloud.com/setup/ws/1/accountLogin'
const SECURITY_URI = 'https://idmsa.apple.com/appleauth/auth/verify/trusteddevice/securitycode'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const prompt = (q) => new Promise((resolve) => {
  rl.question(q, (answer) => {
    resolve(answer)
    rl.close()
  })
})

class Cloud {
  constructor ({ appleId, password }) {
    Object.assign(this, { appleId, password })

    this.user = null
    this.services = null

    this.cookies = []
  }

  async login () {
    // see https://github.com/fastlane/fastlane/blob/1af33c0884e783867bdc07a324280ec6bef124ad/spaceship/lib/spaceship/client.rb#L438
    const response = await fetch(ICLOUD_AUTH_SIGNIN, {
      credentials: 'include',
      method: 'POST',
      headers: this.headers({ 'Accept': 'application/json' }),
      body: JSON.stringify({ accountName: this.appleId, password: this.password, rememberMe: false, trustTokens: [] })
    })
    const text = await response.text()
    const { authType } = JSON.parse(text)
    const dsWebAuthToken = response.headers.get('x-apple-session-token')
    console.log(response.status, authType, response.headers);
    this.cookies = response.headers.get('set-cookie').replace(/(Secure|HttpOnly),/gi, '$1;')

    let accountResponse;
    /*
    let accountResponse = await fetch(ICLOUD_ACCOUNT_URI, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ dsWebAuthToken })
    })
    console.log(accountResponse.status);
    this.cookies = accountResponse.headers.get('set-cookie').replace(/(Secure|HttpOnly),/gi, '$1;')
    */

    // check if 2fa
    if (authType === 'hsa2') {
      const sessionId = response.headers.get('x-apple-id-session-id')
      const code = await prompt('What is the security code?')
      const secureResponse = await fetch(SECURITY_URI, {
        credentials: 'include',
        method: 'POST',
        headers: this.headers({ 'X-Apple-ID-Session-Id': sessionId }),
        body: JSON.stringify({ 'securityCode': { code } })
      })
      console.log(secureResponse.status, secureResponse.headers)

      accountResponse = await fetch(ICLOUD_ACCOUNT_URI, {
        credentials: 'include',
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ dsWebAuthToken: secureResponse.headers.get('x-apple-session-token') })
      })
      console.log(accountResponse.status, accountResponse.headers);
    }

    if (accountResponse.status !== 200) {
      return null
    }

    const {
      dsInfo: user,
      webservices: services
    } = await accountResponse.json()

    this.user = user
    this.services = services
    this.cookies = accountResponse.headers.get('set-cookie').replace(/(Secure|HttpOnly),/gi, '$1;')

    /*
    if (!this.cookies.includes('X-APPLE-WEBAUTH-TOKEN')) {
      console.log(response.headers.get('x-apple-session-token'))
      const code = await prompt('What is the security code?')
      const secureResponse = await fetch(SECURITY_URI, {
        method: 'POST',
        headers: this.headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ securityCode: { code } })
      })
      const dsWebAuthToken = secureResponse.headers.get('x-apple-session-token')
      const text = await secureResponse.text()
      console.log(secureResponse.status, text);

      const newResponse = await fetch(ICLOUD_LOGIN_URI, {
        method: 'POST',
        headers: this.headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ accountCountryCode: 'USA', dsWebAuthToken })
      })
      this.cookies = newResponse.headers.get('set-cookie').replace(/(Secure|HttpOnly),/gi, '$1;')
      console.log(this.cookies, this.cookies.includes('X-APPLE-WEBAUTH-TOKEN'));
    }
    */

    return this.user
  }

  async reminders () {
    if (!this.user) {
      await this.login()
    }

    // create helper for this formatting
    const service = url.parse(this.services['reminders'].url)
    service.pathname = '/rd/startup'
    service.search = this.params()
    delete service.host
    delete service.port

    const response = await fetch(url.format(service), {
      headers: this.headers()
    })
    try {
      const data = await response.clone().json()

      return data
    } catch (_) {
      const text = await response.text()
      return text
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
