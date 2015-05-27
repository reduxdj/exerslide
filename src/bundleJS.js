import _ from 'lodash';
import browserify from 'browserify';
import fs from 'fs';
import path from 'path';
import transformify from 'transformify';
import watchify from 'watchify';
import {logError, logWrite} from './log';

function replaceTransform(data) {
  return transformify(str => _.template(str)(data));
}

/**
 * Returns the JavaScript files that have been bundled
 */
export default function bundleJS(data, options, watchCallback=()=>{}) {
  const BUNDLE = path.join(options.outDir, 'app.js');
  let files = [];
  return new Promise(resolve => {
    let b = browserify(
        data.APP_FILE,
        Object.assign({debug: options.watch}, watchify.args)
      )
      .transform('babelify')
      .transform(replaceTransform(data))
      .transform('brfs')
      .on('file', path => files.push(path));

    if (options.watch) {
      b = watchify(b)
      .on('update', () => {
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
    }

    b.bundle()
    .pipe(fs.createWriteStream(BUNDLE))
    .on('close', resolve);
  }).then(() => {
      logWrite(BUNDLE);
      return files;
  });
}
