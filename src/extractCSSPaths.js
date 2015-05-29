import _ from 'lodash';
import Promise from 'bluebird';
import fs from 'fs';
import path from 'path';

let CSS_DOCLET_PATTERN = /^ \* +@css +(.+)$/mg;
let URL_PATTERN = /^https?:\/\//;

export default function exportCSSPaths(files) {
  return Promise.all(files)
    .map(file => fs.readFileAsync(file, 'utf-8').then(content => {
      let matches = [];
      let match;
      while ((match = CSS_DOCLET_PATTERN.exec(content))) {
        matches.push(match[1]);
      }
      return matches.map(
        p => URL_PATTERN.test(p) ? p : path.resolve(path.dirname(file), p)
      );
    }))
    .then(_.flatten);
}
