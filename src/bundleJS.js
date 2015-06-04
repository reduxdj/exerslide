import _ from 'lodash';
import browserify from 'browserify';
import babelify from 'babelify';
import brfs from 'brfs';
import envify from 'envify/custom';
import fs from 'fs';
import path from 'path';
import transformify from 'transformify';
import uglifyify from 'uglifyify';
import watchify from 'watchify';
import {logProgress, logInfo, logError, logWrite} from './log';

function replaceTransform(data) {
  return transformify(str => {
    try {
      return _.template(str)(data);
    } catch(ex) {
      return str;
    }
  });
}

/**
 * Returns the JavaScript files that have been bundled
 */
export default function bundleJS(data, options, watchCallback=()=>{}) {
  const BUNDLE = path.join(options.outDir, 'app.js');
  let files = [];
  let promise = new Promise(resolve => {
    let b = browserify(
        data.APP_FILE,
        Object.assign({debug: options.watch}, watchify.args)
      )
      .transform(babelify)
      .transform(replaceTransform(data))
      .transform(brfs)
      .on('file', path => files.push(path));

    if (options.watch) {
      b = watchify(b)
      .on('update', () => {
        logInfo('Bundle JS:\n');
        files = [];
        b.bundle()
        .on('error', function(err) {
          logError(err);
          this.emit('end');
        })
        .pipe(fs.createWriteStream(BUNDLE))
        .on('close', () => {
          watchCallback(files);
          logWrite(BUNDLE);
        });
      });
    } else {
      b.transform({global: true}, envify({NODE_ENV: 'production'}))
        .transform({global: true}, uglifyify);
    }

    b.bundle()
    .pipe(fs.createWriteStream(BUNDLE))
    .on('close', resolve);
  }).then(() => files);
  logProgress('Bundle JS', promise).then(() => logWrite(BUNDLE));
  return promise;
}
