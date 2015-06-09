import Promise from 'bluebird';
import _ from 'lodash';
import bundleJS from './bundleJS';
import extractAndBundleCSSFiles from './extractAndBundleCSSFiles';
import fs from 'fs';
import generateSlideObjects from './generateSlideObjects';
import findConfig from './findConfig';
import path from 'path';
import tmp from 'tmp';
import watchFiles from './watchFiles';
import {logError, logProgress, logInfo, logDelete, logMove} from './log';

Promise.promisifyAll(fs);

tmp.setGracefulCleanup();

const TEMPLATE_DIR = path.join(__dirname, '../template');
const APP_FILE = path.join(__dirname, '../js', 'app.js');

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

  return layouts.map(layoutName => {
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
    return layoutFile;
  });
}

function generateLayoutsFile(slides, layoutDirs) {
  let layouts = _.uniq(
    slides
    .map(slide => slide.layout)
    .filter(v => v)
    .sort(),
    true
  );
  return resolveLayouts(layouts, layoutDirs).then(layoutPaths => {
    return layouts.reduce((lines, name, i) => {
      lines.push(
        `import ${name} from '${layoutPaths[i]}';`,
        `export {${name}};`
      );
      return lines;
    }, []).join('\n');
  });
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

function prepareSlidesAndLayoutFile(slidesPath, layoutPath, options) {
  let promise = generateSlideObjects(
      options.path,
      options.config.defaultLayouts
    )
    .then(slides => {
      fs.writeFileSync(slidesPath, JSON.stringify(slides));
      return generateLayoutsFile(slides, options.config.layouts)
        .then(layoutsFile => fs.writeFileSync(layoutPath, layoutsFile))
        .then(() => slides);
    });
  return logProgress('Processing slides', promise);
}

function copyStaticFiles(data, options, files) {
  logInfo('Copying static files:\n');
  return copyFiles(
    files || options.config.statics,
    options.outDir,
    c => _.template(c)(data)
  );
}

async function bundle(options) {
  let tmpDir = tmp.dirSync().name;
  const SLIDES_FILE = path.join(tmpDir, 'slides.json');
  const LAYOUTS_FILE = path.join(tmpDir, 'layouts.js');
  const CSS_FILE = path.join(options.outDir, 'style.css');

  try {
    await prepareSlidesAndLayoutFile(SLIDES_FILE, LAYOUTS_FILE, options);
  } catch(err) {
    logError('Unable to process slides: ' + err.message);
    return;
  }
  let data = {
    SLIDES_FILE,
    LAYOUTS_FILE,
    CSS_FILE,
    APP_FILE,
    MASTER_LAYOUT_PATH: options.config.masterLayout,
    META: options.config.meta
  };
  let [__, jsFiles] = await Promise.join(
    copyStaticFiles(data, options),
    bundleJS(
      data,
      options,
      options.watch ?
        changedJSFiles => {
          jsFiles = _.uniq(jsFiles.concat(changedJSFiles));
          extractAndBundleCSSFiles(jsFiles, data, options);
        } :
        null
    )
  );
  await extractAndBundleCSSFiles(jsFiles, data, options);

  if (options.watch) {
    // statics
    logInfo('Watching static files:\n');
    watchFiles(options.config.statics, (event, f) => {
      switch(event) {
        case 'add':
        case 'change':
          copyStaticFiles(data, options, [f]);
          break;
        case 'unlink':
          deleteFiles([path.join(options.outDir, path.basename(f))]);
          break;
      }
    });
    // slides
    logInfo('Watching slides:\n');
    watchFiles(options.path, () => {
      prepareSlidesAndLayoutFile(SLIDES_FILE, LAYOUTS_FILE, options);
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
    findConfig(TEMPLATE_DIR),
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
