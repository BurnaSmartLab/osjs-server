/*!
 * OS.js - JavaScript Cloud/Web Desktop Platform
 *
 * Copyright (c) 2011-2018, Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence Simplified BSD License
 */

const {ServiceProvider} = require('@osjs/common');

const nullAdapter = (core, options) => ({
  login: (req, res) => Promise.resolve(req.body),
  logout: (req, res) => Promise.resolve(true)
});

/**
 * OS.js Auth Service Provider
 *
 * @desc Creates the login prompt and handles authentication flow
 */
class AuthServiceProvider extends ServiceProvider {

  constructor(core, options) {
    options = Object.assign({
      adapter: nullAdapter
    }, options);

    super(core, options);

    this.adapter = options.adapter(core, options.config);
  }

  destroy() {
    if (this.adapter.destroy) {
      this.adapter.destroy();
    }

    super.destroy();
  }

  async init() {
    this.core.make('osjs/express')
      .route('post', '/login', (req, res) => this.login(req, res));

    this.core.make('osjs/express')
      .routeAuthenticated('post', '/logout', (req, res) => this.logout(req, res));

    if (this.adapter.init) {
      await this.adapter.init();
    }
  }

  async login(req, res) {
    const result = await this.adapter.login(req, res);
    if (result) {
      const {username} = result;
      req.session.username = username;

      res.json({
        user: {username}
      });
    } else {
      res.status(403)
        .json({error: 'Invalid login'});
    }
  }

  async logout(req, res) {
    const result = await this.adapter.logout(req, res);

    try {
      req.session.destroy();
    } catch (e) {
      console.warn(e);
    }

    res.json({});
  }

}

module.exports = AuthServiceProvider;
