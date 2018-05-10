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
const mime = require('mime-types');

/*
 * Creates an object readable by client
 */
const createFileIter = (realRoot, file) => {
  const filename = path.basename(file);
  const realPath = path.join(realRoot, filename);

  return fs.stat(realPath).then(stat => ({
    isDirectory: stat.isDirectory(),
    isFile: stat.isFile(),
    mime: stat.isFile()
      ? mime.lookup(realPath) || 'application/octet-stream'
      : null,
    size: stat.size,
    path: file,
    filename,
    stat
  }));
};

module.exports = (core) => ({

  /**
   * Checks if file exists
   * @param {String} file The file path from client
   * @return {Promise<boolean, Error>}
   */
  exists: vfs => file => 
    Promise.resolve(vfs.resolve(file))
      .then(realPath => fs.access(realPath, fs.F_OK))
      .catch(() => false)
      .then(() => true),

  /**
   * Get file statistics
   * @param {String} file The file path from client
   * @return {Object}
   */
  stat: vfs => file =>
    Promise.resolve(vfs.resolve(file))
      .then(realPath => createFileIter(path.dirname(realPath), realPath)),

  /**
   * Reads directory
   * @param {String} root The file path from client
   * @return {Object[]}
   */
  readdir: vfs => root =>
    Promise.resolve(vfs.resolve(root))
      .then(realPath => fs.readdir(realPath).then(files => ({realPath, files})))
      .then(({realPath, files}) => {
        const promises = files.map(f => createFileIter(realPath, root.replace(/\/?$/, '/') + f))
        return Promise.all(promises);
      }),

  /**
   * Reads file stream
   * @param {String} file The file path from client
   * @return {stream.Readable}
   */
  readfile: vfs => file =>
    Promise.resolve(vfs.resolve(file))
      .then(realPath => fs.stat(realPath).then(stat => ({realPath, stat})))
      .then(({realPath, stat}) => stat.isFile() ? fs.createReadStream(realPath, {
        flags: 'r'
      }) : false),

  /**
   * Creates directory
   * @param {String} file The file path from client
   * @return {boolean}
   */
  mkdir: vfs => file => 
    Promise.resolve(vfs.resolve(file))
      .then(realPath => fs.mkdir(realPath))
      .then(() => true),

  /**
   * Writes file stream
   * @param {String} file The file path from client
   * @param {stream.Readable} data The stream
   * @return {Promise<boolean, Error>}
   */
  writefile: vfs => (file, data) => new Promise((resolve, reject) => {
    // FIXME: Currently this actually copies the file because
    // formidable will put this in a temporary directory.
    // It would probably be better to do a "rename()" on local filesystems
    const realPath = vfs.resolve(file);

    const write = () => {
      const stream = fs.createWriteStream(realPath);
      data.on('error', err => reject(err));
      data.on('end', () => resolve(true));
      data.pipe(stream);
    };

    fs.stat(realPath).then(stat => {
      if (stat.isDirectory()) {
        resolve(false);
      } else {
        write();
      }
    }).catch((err) => err.code === 'ENOENT' ? write()  : reject(err));
  }),

  /**
   * Renames given file or directory
   * @param {String} src The source file path from client
   * @param {String} dest The destination file path from client
   * @return {boolean}
   */
  rename: vfs => (src, dest) =>
    Promise.resolve({
      realSource: vfs.resolve(src),
      realDest: vfs.resolve(dest)
    })
    .then(({realSource, realDest}) => fs.rename(realSource, realDest))
    .then(() => true),

  /**
   * Copies given file or directory
   * @param {String} src The source file path from client
   * @param {String} dest The destination file path from client
   * @return {boolean}
   */
  copy: vfs => (src, dest) =>
    Promise.resolve({
      realSource: vfs.resolve(src),
      realDest: vfs.resolve(dest)
    })
    .then(({realSource, realDest}) => fs.copy(realSource, realDest))
    .then(() => true),

  /**
   * Removes given file or directory
   * @param {String} file The file path from client
   * @return {boolean}
   */
  unlink: vfs => file =>
    Promise.resolve(vfs.resolve(file))
      .then(realPath => fs.unlink(realPath))
      .then(() => true)
});
