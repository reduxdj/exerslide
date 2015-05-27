import Promise from 'bluebird';
import _ from 'lodash';
import browserify from 'browserify';
import chalk from 'chalk';
import cssmin from 'cssmin';
import fs from 'fs';
import fetch from 'node-fetch';
import generateSlideObjects from './generateSlideObjects';
import extractCSSPaths from './extractCSSPaths';
import findConfig from './findConfig';
import path from 'path';
import tmp from 'tmp';
import transformify from 'transformify';
import chokidar from 'chokidar';
import watchify from 'watchify';

Promise.promisifyAll(fs);

tmp.setGracefulCleanup();
const error = chalk.bold.red;
const info = chalk.bold.green;
const add = chalk.blue;
const remove = chalk.red;

const URL_PATTERN = /^https?:\/\//;

const TEMPLATE_DIR = path.join(__dirname, '../template');
const APP_FILE = path.join(TEMPLATE_DIR, 'js', 'app.js');
const STATIC_DIR = path.join(TEMPLATE_DIR, 'statics');
const MASTER_LAYOUT = path.join(TEMPLATE_DIR, 'MasterLayout.js');

const DEFAULT_OPTIONS = {
  config: {},
  outDir: './',
  watch: false
};

function relative(p) {
  if (Array.isArray(p)) {
    return p.map(p => path.relative(process.cwd(), p)).join(', ');
  }
  return path.relative(process.cwd(), p);
}

function logMove(from, to) {
  process.stdout.write(add(`Copied ${relative(from)} -> ${relative(to)}\n`));
}

function logDelete(p) {
  process.stdout.write(remove(`Deleted ${relative(p)}\n`));
}

function logWrite(p) {
  process.stdout.write(add(`Updated ${relative(p)}\n`));
}

function logError(err) {
  process.stderr.write(error(`${err.toString()}\n`));
}

function resolveLayouts(layouts, layoutDirs) {
  return Promise.all(layouts).map(layout => {
    layout = layout + '.js';
    let layoutPath;
    layoutDirs.some(dir => {
      try {
        fs.statSync(path.join(dir, layout));
      } catch(err) {
        if (err.toString().indexOf('no such file') === -1) {
          throw err;
        }
        return false;
      }
      layoutPath = path.join(dir, layout);
      return true;
    });
    if (!layoutPath) {
      throw new Error(
        `Unable to find layout "${layout}" in ${layoutDirs.toString()}`
      );
    }
    return layoutPath;
  });
}

function generateLayoutsFile(slides, layoutDirs) {
  let layouts = _.uniq(slides.map(slide => slide.layout).sort(), true);
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

function replaceTransform(data) {
  return transformify(str => _.template(str)(data));
}

/**
 * Returns the JavaScript files that have been bundled
 */
function bundleJS(data, options) {
  const BUNDLE = path.join(options.outDir, 'app.js');
  let files = [];
  return new Promise(resolve => {
    let b = browserify(
        APP_FILE,
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
        .on('close', () => logWrite(BUNDLE));
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

function bundleCSS(filesToBundle, data, options) {
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
    watchFiles(
      filesToBundle.filter(p => !URL_PATTERN.test(p)),
      () => bundle(filesToBundle).catch(e => error(e.message))
    );
  }
  return bundle(filesToBundle);
}

function watchFiles(root, handler) {
  process.stdout.write(info(`Watching "${relative(root)}"...\n`));
  chokidar.watch(root, {ignoreInitial: true}).on('all', handler);
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

function copyFiles(root, files, outDir, mapper) {
  mapper = mapper || _.identity;
  files.forEach(
    filePath => {
      let fromPath = path.join(root, filePath);
      let toPath = path.join(outDir, filePath);
      let content = fs.readFileSync(fromPath);
      if (mapper && mappedFiles.has(path.extname(fromPath))) {
        content = mapper(content);
      }
      fs.writeFileSync(toPath, content);
      logMove(fromPath, toPath);
    }
  );
}

async function copyStaticFiles(data, outDir, mapper) {
  let files = await fs.readdirAsync(STATIC_DIR);
  copyFiles(STATIC_DIR, files, outDir, mapper);
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
    MASTER_LAYOUT_PATH: options.config.masterLayout
  };
  let [__, jsFiles] = await Promise.join(
    copyStaticFiles(data, options.outDir, c => _.template(c, data)()),
    bundleJS(data, options)
  );
  let cssFilePaths = await extractCSSPaths(
    jsFiles.filter(p => p.indexOf('node_modules/') === -1)
  );
  await bundleCSS(cssFilePaths.concat(options.config.styles), data, options);

  if (options.watch) {
    // statics
    watchFiles(STATIC_DIR, (event, f) => {
      switch(event) {
        case 'add':
        case 'change':
          copyFiles(
            STATIC_DIR,
            [path.relative(STATIC_DIR, f)],
            options.outDir,
            c => _.template(c, data)()
          );
          break;
        case 'unlink':
          deleteFiles([path.join(STATIC_DIR, path.relative(STATIC_DIR, f))]);
          break;
      }
    });
    // slides
    watchFiles(options.path, event => {
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
      defaultConfig, projectConfig, options.config,
      (a,b) => Array.isArray(a) ? a.concat(b) : void 0
    );
    return options;
  })
  .then(() => bundle(options))
  .catch(err => {
    process.stderr.write(error(err.toString() + '\n'));
    process.exit(1);
  });
};
