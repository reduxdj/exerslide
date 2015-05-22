import Promise from 'bluebird';
import _ from 'lodash';
import browserify from 'browserify';
import chalk from 'chalk';
import fs from 'fs';
import generateSlideObjects from './generateSlideObjects';
import path from 'path';
import tmp from 'tmp';
import transformify from 'transformify';
import watch from 'watch';
import watchify from 'watchify';

Promise.promisifyAll(fs);

tmp.setGracefulCleanup();
const error = chalk.bold.red;
const info = chalk.bold.green;
const add = chalk.blue;
const remove = chalk.red;

const TEMPLATE_DIR = path.join(__dirname, '../template');
const LAYOUT_DIR = path.join(TEMPLATE_DIR, 'layout');
const APP_FILE = path.join(TEMPLATE_DIR, 'js', 'app.js');
const STATIC_DIR = path.join(TEMPLATE_DIR, 'statics');

const DEFAULT_OPTIONS = {
  layout: [LAYOUT_DIR],
  outDir: './',
  watch: false,
};

function relative(p) {
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

function augmentOptions(options) {
  for (let option in DEFAULT_OPTIONS) {
    let defaultOption = DEFAULT_OPTIONS[option];
    let userOption = options[option];

    if (!options[option]) {
      options[option] = defaultOption;
    } else {
      if (Array.isArray(defaultOption)) {
        options[option] = Array.isArray(userOption) ?
          userOption.concat(defaultOption) :
          [userOption].concat(defaultOption);
      }
    }
  }

  return options;
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

function bundleJS(data, options) {
  const BUNDLE = path.join(options.outDir, 'app.js');
  return new Promise(resolve => {
    let b = browserify(APP_FILE, watchify.args)
      .transform('babelify')
      .transform(replaceTransform(data))
      .transform('brfs');

    if (options.watch) {
      b = watchify(b)
      .on('update', () => {
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
  });
}

function watchFiles(root, handler) {
  process.stdout.write(info(`Watching "${relative(root)}"...\n`));
  watch.createMonitor(root, monitor => {
    monitor.on('changed', f => handler('changed', f));
    monitor.on('created', f => handler('created', f));
    monitor.on('deleted', f => handler('deleted', f));
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

function copyFiles(root, files, outDir, mapper) {
  mapper = mapper || _.identity;
  files.forEach(
    filePath => {
      let fromPath = path.join(root, filePath);
      let toPath = path.join(outDir, filePath);
      let content = fs.readFileSync(fromPath);
      fs.writeFileSync(toPath, content);
      logMove(fromPath, toPath);
    }
  );
}

function copyStaticFiles(data, outDir) {
  return fs.readdirAsync(STATIC_DIR).then(files => {
    copyFiles(STATIC_DIR, files, outDir);
  });
}

function prepareSlidesAndLayoutFile(slidesPath, layoutPath, options) {
  return generateSlideObjects(options.path)
    .then(slides => {
      fs.writeFileSync(slidesPath, JSON.stringify(slides));
      return slides;
    })
    .then(slides => {
      return generateLayoutsFile(slides, options.layout).then(layoutsFile => {
        fs.writeFileSync(layoutPath, layoutsFile);
        return slides;
      });
    });
}


export default function exerslide(options) {
  options = augmentOptions(options);
  let tmpDir = tmp.dirSync().name;
  const SLIDES_FILE = path.join(tmpDir, 'slides.json');
  const LAYOUTS_FILE = path.join(tmpDir, 'layouts.js');

  // This is a multi step process:
  // - Build the slides array
  // - Compute dependencies of layout components
  // - Copy and bundle JS files
  // - Copy static files

  prepareSlidesAndLayoutFile(SLIDES_FILE, LAYOUTS_FILE, options)
    .then(() => {
      let data = {
        SLIDES_FILE,
        LAYOUTS_FILE
      };
      return Promise.join(
        copyStaticFiles(data, options.outDir),
        bundleJS(data, options)
      ).then(() => data);
    })
    .then(() => {
      if (options.watch) {
        watchFiles(STATIC_DIR, (event, f) => {
          switch(event) {
            case 'changed':
            case 'created':
              copyFiles(
                STATIC_DIR,
                [path.relative(STATIC_DIR, f)],
                options.outDir
              );
              break;
            case 'deleted':
              deleteFiles([path.join(STATIC_DIR, path.relative(STATIC_DIR, f))])
              break;
          }
        });
        watchFiles(options.path, event => {
          switch(event) {
            case 'changed':
            case 'created':
            case 'deleted':
              prepareSlidesAndLayoutFile(SLIDES_FILE, LAYOUTS_FILE, options);
              break;
          }
        });
      }
    })
    .catch(err => {
      process.stderr.write(error(err.toString() + '\n'));
      process.exit(1);
    });
}
