import Promise from 'bluebird';
import _ from 'lodash';
import cssmin from 'cssmin';
import extractCSSPaths from './extractCSSPaths';
import fetch from 'node-fetch';
import fs from 'fs';
import watchFiles from './watchFiles';
import {logWrite, logError} from './log';

const URL_PATTERN = /^https?:\/\//;

let watcher;
let prevFilesToWatch;

function same(a, b) {
  b = b.slice().sort();
  return a.slice().sort().every((v, i) => v === b[i]);
}

function bundleCSS(filesToBundle, data, options) {
  filesToBundle = _.uniq(filesToBundle);
  async function bundle(files) { let css = await Promise.all(files)
      .map(filePath => URL_PATTERN.test(filePath) ?
        fetch(filePath).then(response => response.text()) :
        fs.readFileAsync(filePath, 'utf-8')
      )
      .map((content, i) => `/* FILE ${files[i]} */\n${content}`);
    css = css.join('\n');
    if (!options.watch) {
      css = cssmin(css);
    }
    return fs.writeFileAsync(data.CSS_FILE, css)
      .then(() => logWrite(data.CSS_FILE));
  }
  if (options.watch) {
    let filesToWatch = filesToBundle.filter(p => !URL_PATTERN.test(p));
    if (watcher) {
      if (same(filesToWatch, prevFilesToWatch)) {
        return prevFilesToWatch;
      }
      watcher.close();
    }
    prevFilesToWatch = filesToWatch;
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
  return bundle(filesToBundle);
}

export default async function extractAndBundleCSSFiles(jsFiles, data, options) {
  let cssFilePaths = await extractCSSPaths(
    jsFiles.filter(p => p.indexOf('node_modules/') === -1)
  );
  await bundleCSS(cssFilePaths.concat(options.config.styles), data, options);
}
