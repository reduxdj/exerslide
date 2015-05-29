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
import {logDelete, logMove} from './log';

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

async function prepareSlidesAndLayoutFile(slidesPath, layoutPath, options) {
  let slides = await generateSlideObjects(
    options.path,
    options.config.defaultLayouts
  );
  fs.writeFileSync(slidesPath, JSON.stringify(slides));
  let layoutsFile = await generateLayoutsFile(slides, options.config.layouts);
  fs.writeFileSync(layoutPath, layoutsFile);
  return slides;
}


async function bundle(options) {
  let tmpDir = tmp.dirSync().name;
  const SLIDES_FILE = path.join(tmpDir, 'slides.json');
  const LAYOUTS_FILE = path.join(tmpDir, 'layouts.js');
  const CSS_FILE = path.join(options.outDir, 'style.css');

  // This is a multi step process:
  // - Build the slides array
  // - Compute dependencies of layout components
  // - Bundle JS files
  // - Bundle CSS files
  // - Copy static files

  await prepareSlidesAndLayoutFile(SLIDES_FILE, LAYOUTS_FILE, options);
  let data = {
    SLIDES_FILE,
    LAYOUTS_FILE,
    CSS_FILE,
    APP_FILE,
    MASTER_LAYOUT_PATH: options.config.masterLayout
  };
  let [__, jsFiles] = await Promise.join(
    copyFiles(
      options.config.statics,
      options.outDir,
      c => _.template(c, data)()
    ),
    bundleJS(
      data,
      options,
      options.watch ?
        changedJSFiles => extractAndBundleCSSFiles(jsFiles.concat(changedJSFiles), data, options) :
        null
    )
  );
  await extractAndBundleCSSFiles(jsFiles, data, options);

  if (options.watch) {
    // statics
    watchFiles(options.config.statics, (event, f) => {
      switch(event) {
        case 'add':
        case 'change':
          copyFiles(
            options.config.statics,
            options.outDir,
            c => _.template(c, data)()
          );
          break;
        case 'unlink':
          deleteFiles([path.join(options.outDir, path.basename(f))]);
          break;
      }
    });
    // slides
    watchFiles(options.path, () => {
      prepareSlidesAndLayoutFile(SLIDES_FILE, LAYOUTS_FILE, options);
    });
  }
}

export default function exerslide(options) {
  options = _.defaults(options, DEFAULT_OPTIONS);

  // Load default and project config
  return Promise.join(
    findConfig(path.resolve(__dirname, '../template')),
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
};;
