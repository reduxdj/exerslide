import fs from 'fs';
import path from 'path';
import glob from 'glob';

const PACKAGE_JSON = 'package.json';
const CONFIG_NAME = '.exersliderc';
const URL_PATTERN = /^https?:\/\//;
const PROPS_TO_RESOLVE = [
  'masterLayout',
  'styles',
  'layouts',
  'statics'
];

function absPaths(root, ps) {
  let result = [];
  ps.map(
    p => URL_PATTERN.test(p) ? p : path.resolve(root, p)
  )
  .forEach(p => {
    if (!URL_PATTERN.test(p) && glob.hasMagic(p)) {
      result.push.apply(result, glob.sync(p));
    } else {
      result.push(p);
    }
  });
  return result;
}

function absConfig(root, config) {
  PROPS_TO_RESOLVE.forEach(prop => {
    if (config.hasOwnProperty(prop)) {
      if (Array.isArray(config[prop])) {
        config[prop] = absPaths(root, config[prop]);
      } else if (!URL_PATTERN.test(config[prop])) {
        config[prop] = path.resolve(root, config[prop]);
      }
    }
  });
  return config;
}

/**
 * Finds the closest .exerslide file in the hierarchy.
 */
export default async function findConfig(dir) {
  let files = await fs.readdirAsync(dir);
  if (files.indexOf(CONFIG_NAME) > -1) {
    return absConfig(
      dir,
      JSON.parse(await fs.readFileAsync(path.join(dir, CONFIG_NAME)))
    );
  } else if(files.indexOf(PACKAGE_JSON) > -1) {
    let pkg = JSON.parse(
      await fs.readFileAsync(path.join(dir, PACKAGE_JSON))
    );
    if (pkg.exerslide) {
      return absConfig(dir, pkg.exerslide);
    }
  }
  if (dir === '/' || dir === '.' || dir === '..') {
    return null;
  } else {
    return await findConfig(path.dirname(dir));
  }
}
