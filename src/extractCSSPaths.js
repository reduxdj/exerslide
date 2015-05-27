import Promise from 'bluebird';
import fs from 'fs';
import path from 'path';

let CSS_DOCLET_PATTERN = /^ \* +@css +(.+)$/m;
let URL_PATTERN = /^https?:\/\//;

export default function exportCSSPaths(files) {
  return Promise.all(files)
    .map(file => fs.readFileAsync(file, 'utf-8').then(content => {
      let match = content.match(CSS_DOCLET_PATTERN);
      if (match) {
        return URL_PATTERN.test(match[1]) ?
          match[1] :
          path.resolve(path.dirname(file), match[1]);
      }
    }))
    .filter(v => v !== void 0);
}
