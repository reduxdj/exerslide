/*eslint consistent-return: 0*/
import Promise from 'bluebird';
import _ from 'lodash';
import cssmin from 'cssmin';
import extractCSSPaths from './extractCSSPaths';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import watchFiles from './watchFiles';
import {logInfo, logList, logProgress, logWrite, logError} from './log';

let NODE_MODULES_DIR = path.join(__dirname, '../node_modules');
const URL_PATTERN = /^https?:\/\//;

let watcher;
let prevFilesToWatch;

function same(a, b) {
  b = b.slice().sort();
  return a.slice().sort().every((v, i) => v === b[i]);
}

async function bundleCSS(filesToBundle, options) {
  const BUNDLE = path.join(options.outDir, 'style.css');
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
        return fs.writeFileAsync(BUNDLE, css);
      });
    logProgress(promise).then(() => logWrite(BUNDLE));
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

export default function extractAndBundleCSSFiles(jsFiles, options) {
  jsFiles = _.uniq(jsFiles);
  return extractCSSPaths(
    // Only inspect direct depends for @css declarations
    // Ignore exerslide/node_modules if executed in it's own folder
    jsFiles.filter(p => {
      let match;
      return p.indexOf(NODE_MODULES_DIR) === -1 &&
           (!(match = p.match(/node_modules\//g)) || match.length <= 1);
    }
    )
  ).then(cssFilePaths => bundleCSS(
    cssFilePaths.concat(options.config.styles),
    options
  ));
}
