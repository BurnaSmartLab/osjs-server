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

const fs = require('fs-extra');
const path = require('path');
const {ServiceProvider} = require('@osjs/common');

const nullAdapter = (core, options) => ({
  save: (req, res) => Promise.resolve(true),
  load: (req, res) => Promise.resolve({})
});

const fsAdapter = (core, options) => {
  const fsOptions = Object.assign({
    path: 'home:/.osjs/settings.json',
    resolve: (req, dest) => core.make('osjs/vfs').resolve(req, dest)
  }, options || {});

  const getAdapterPath = req => Promise.resolve(
    fsOptions.resolve(req, fsOptions.path)
  );

  const ensureDir = p => fs.ensureDir(path.dirname(p))
    .then(() => p);

  return {
    save: (req, res) => getAdapterPath(req)
      .then(p => ensureDir(p))
      .then(p => fs.writeJson(p, req.body)),
    load: (req, res) => getAdapterPath(req)
      .then(p => ensureDir(p))
      .then(p => fs.readJson(p))
  };
};

/**
 * OS.js Settings Service Provider
 *
 * @desc Provides services for settings
 */
class SettingsServiceProvider extends ServiceProvider {

  constructor(core, options) {
    options = Object.assign({
      adapter: nullAdapter
    }, options);

    if (options.adapter === 'fs') {
      options.adapter = fsAdapter;
    }

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
      .routeAuthenticated('post', '/settings', (req, res) => this.save(req, res));

    this.core.make('osjs/express')
      .routeAuthenticated('get', '/settings', (req, res) => this.load(req, res));

    if (this.adapter.init) {
      await this.adapter.init();
    }
  }

  async save(req, res) {
    const result = await this.adapter.save(req, res);
    res.json(result);
  }

  async load(req, res) {
    const result = await this.adapter.load(req, res);
    res.json(result);
  }
}

module.exports = SettingsServiceProvider;
