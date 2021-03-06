import Promise from 'bluebird';
import _ from 'lodash';
import bundleJS from './bundleJS';
import extractAndBundleCSSFiles from './extractAndBundleCSSFiles';
import * as filePaths from './filePaths';
import findConfig from './findConfig';
import fs from 'fs';
import generateSlideObjects from './generateSlideObjects';
import path from 'path';
import watchFiles from './watchFiles';
import {logError, logProgress, logInfo, logDelete, logMove} from './log';

Promise.promisifyAll(fs);

const DEFAULT_OPTIONS = {
  config: {},
  outDir: './',
  watch: false
};

async function resolveLayouts(layouts, layoutDirs) {
  // Read layout dirs
  let layoutFiles = await Promise.all(
    layoutDirs.map(dir => fs.readdirAsync(dir).map(file => path.join(dir, file)))
  );
  layoutFiles = _.flatten(layoutFiles);

  return layouts.reduce((layoutMap, layoutName) => {
    let layoutFile;
    for (let i = 0; i < layoutFiles.length; i++) {
      let basename = path.basename(layoutFiles[i]);
      basename = basename.substr(0, basename.indexOf('.'));
      if (basename === layoutName) {
        layoutFile = layoutFiles[i];
        break;
      }
    }
    if (!layoutFile) {
      throw new Error(
        `Unable to find layout "${layoutName}" in ${layoutDirs.toString()}`
      );
    }
    layoutMap[layoutName] = layoutFile;
    return layoutMap;
  }, {});
}

function getLayoutPaths(slides, layoutDirs) {
  let layouts = _.uniq(
    slides
    .map(slide => slide.layout)
    .filter(v => v)
    .sort(),
    true
  );
  return resolveLayouts(layouts, layoutDirs);
}

function deleteFiles(files) {
  files.forEach(file => {
    try {
      fs.unlinkSync(file);
      logDelete(file);
    } finally {}
  });
}

let mappedFiles = new Set(['.js', '.html', '.md', '.txt']);

function copyFiles(files, outDir, mapper) {
  mapper = mapper || _.identity;
  files.forEach(
    fromPath => {
      let toPath = path.join(outDir, path.basename(fromPath));
      let content = fs.readFileSync(fromPath);
      if (mapper && mappedFiles.has(path.extname(fromPath))) {
        content = mapper(content);
      }
      fs.writeFileSync(toPath, content);
      logMove(fromPath, toPath);
    }
  );
}

function prepareSlidesAndConfigFile(options) {
  let promise = generateSlideObjects(
      options.path,
      options.config.defaultLayouts
    )
    .then(slides => {
      return getLayoutPaths(slides, options.config.layouts)
        .then(layoutPaths => {
          let layoutNames = Object.keys(layoutPaths);
          let layoutExports = layoutNames.map(
            name => `import ${name} from '${layoutPaths[name]}';`
          ).join('\n');
          layoutExports +=
            `\nexport const Layouts = {\n${layoutNames.join(',\n')}\n};`;

          let configFileContent = `
export const slides = ${JSON.stringify(slides)};
import MasterLayout from '${options.config.masterLayout}';
export {MasterLayout};
${layoutExports}`;

          return fs.writeFileAsync(filePaths.CONFIG_FILE, configFileContent);
        })
        .then(() => slides);
    });
  return logProgress('Processing slides', promise);
}

function copyStaticFiles(options, files) {
  logInfo('Copying static files:\n');
  return copyFiles(
    files || options.config.statics,
    options.outDir,
    c => _.template(c, {variable: 'meta'})(options.config.meta)
  );
}

async function bundle(options) {
  try {
    await prepareSlidesAndConfigFile(options);
  } catch(err) {
    logError('Unable to process slides: ' + err.message);
    return;
  }
  let [__, jsFiles] = await Promise.join(
    copyStaticFiles(options),
    bundleJS(
      options,
      options.watch ?
        changedJSFiles => {
          jsFiles = _.uniq(jsFiles.concat(changedJSFiles));
          extractAndBundleCSSFiles(jsFiles, options);
        } :
        null
    )
  );
  await extractAndBundleCSSFiles(jsFiles, options);

  if (options.watch) {
    // statics
    logInfo('Watching static files:\n');
    watchFiles(options.config.statics, (event, f) => {
      switch(event) {
        case 'add':
        case 'change':
          copyStaticFiles(options, [f]);
          break;
        case 'unlink':
          deleteFiles([path.join(options.outDir, path.basename(f))]);
          break;
      }
    });
    // slides
    logInfo('Watching slides:\n');
    watchFiles(options.path, () => {
      prepareSlidesAndConfigFile(options);
    });
  }
}

/**
 * Short description of the slide generation progress:
 *
 * 1. Read default and project configuration and merge them.
 * 2. Process slides folder:
 *   - Find all slides
 *   - Parse them and create JS objects
 *   - Extract layout information
 *     (slide objects + default config + project config)
 *   - Generate JS module for referenced layouts (temp file)
 *   - Store slide objects  as JSON in a temp file
 * 3. Copy static files (from default config and project config)
 * 3. Process JS with browserify, collect information about processed files
 * 4. Extract @css directives in processed JS files
 * 5. Bundle CSS (in that order):
 *  - Component syles (@css directives)
 *  - Default styles
 *  - Project styles
 */
export default function exerslide(options) {
  options = _.defaults(options, DEFAULT_OPTIONS);

  // Load default and project config
  return Promise.join(
    findConfig(filePaths.TEMPLATE_DIR),
    findConfig(options.path)
  )
  .then(([defaultConfig, projectConfig]) => {
    options.config = _.merge(
      defaultConfig, projectConfig,
      (a, b) => Array.isArray(a) ? a.concat(b) : void 0
    );
    return options;
  })
  .then(() => bundle(options))
  .catch(err => {
    throw err;
  });
};
