/*eslint consistent-return: 0*/
import Promise from 'bluebird';
import _ from 'lodash';
import cssmin from 'cssmin';
import extractCSSPaths from './extractCSSPaths';
import fetch from 'node-fetch';
import fs from 'fs';
import watchFiles from './watchFiles';
import {logInfo, logList, logProgress, logWrite, logError} from './log';

const URL_PATTERN = /^https?:\/\//;

let watcher;
let prevFilesToWatch;

function same(a, b) {
  b = b.slice().sort();
  return a.slice().sort().every((v, i) => v === b[i]);
}

async function bundleCSS(filesToBundle, data, options) {
  filesToBundle = _.uniq(filesToBundle);
  function bundle(files) {
    logInfo('Bundle CSS:\n');
    logList(filesToBundle);
    let promise = Promise.all(files)
      .map(filePath => URL_PATTERN.test(filePath) ?
        fetch(filePath).then(response => response.text()) :
        fs.readFileAsync(filePath, 'utf-8')
      )
      .map((content, i) => `/* FILE ${files[i]} */\n${content}`)
      .then(css => {

        css = css.join('\n');
        if (!options.watch) {
          css = cssmin(css);
        }
        return fs.writeFileAsync(data.CSS_FILE, css);
      });
    logProgress(promise).then(() => logWrite(data.CSS_FILE));
    return promise;
  }

  if (options.watch) {
    let filesToWatch = filesToBundle.filter(p => !URL_PATTERN.test(p));
    if (watcher) {
      if (same(filesToWatch, prevFilesToWatch)) {
        return;
      }
      watcher.close();
    }
    prevFilesToWatch = filesToWatch;
    logInfo('Watching CSS:\n');
    watcher = watchFiles(
      filesToWatch,
      (event, path) => {
        if (event === 'unlink') {
          filesToBundle = filesToBundle.filter(f => f !== path);
        }
        bundle(filesToBundle).catch(e => logError(e.message));
      }
    );
  }
  return await bundle(filesToBundle);
}

export default function extractAndBundleCSSFiles(jsFiles, data, options) {
  jsFiles = _.uniq(jsFiles);
  return extractCSSPaths(
    jsFiles.filter(p => p.indexOf('node_modules/') === -1)
  ).then(cssFilePaths => bundleCSS(
    cssFilePaths.concat(options.config.styles),
    data,
    options
  ));
}
