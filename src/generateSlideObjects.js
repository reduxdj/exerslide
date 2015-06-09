import fs from 'fs';
import path from 'path';
import yaml from 'yaml-js';
import _ from 'lodash';
import {logError} from './log';

const fileTypes = new Set(['.js', '.html', '.md', '.txt']);

function readFolder(folderPath, withSubfolders=false) {
  return fs.readdirAsync(folderPath)
    .then(_.sort)
    .map(fileName => {
      let filePath = path.join(folderPath, fileName);
      return fs.statAsync(filePath).then(stat => {
        if (withSubfolders && stat.isDirectory()) {
          return readFolder(filePath);
        } else if (stat.isFile() && fileTypes.has(path.extname(fileName))) {
          return fs.readFileAsync(filePath, {encoding: 'utf-8'})
            .then(fileContent => ({fileContent, fileName}));
        }
      });
    })
    .filter(x => Array.isArray(x) ? x.length > 0 : x);
}

function parseFile(fileContent) {
  const DIVIDER = /^-{3}\n+/mg;

  // try to find YAML front matter
  let frontMatter = '';
  let content = '';
  let firstMatch = DIVIDER.exec(fileContent);
  let hasFrontMatter = firstMatch && firstMatch.index === 0;
  if (hasFrontMatter) {
    let secondMatch = DIVIDER.exec(fileContent);
    if (secondMatch) {
      frontMatter = fileContent.substring(
        firstMatch.index + firstMatch[0].length,
        secondMatch.index
      );
      content = fileContent.substr(DIVIDER.lastIndex);
    } else {
      throw new Error('Unable to find end of front matter');
    }
  } else {
    content = fileContent;
  }
  let slide = {};
  if (frontMatter) {
    try {
      slide = yaml.load(frontMatter);
    } catch(err) {
      /*eslint camelcase: 0, comma-spacing: 0*/
      let {problem, problem_mark: {line, column}} = err;
      throw new Error(
        `YAML error (line ${line}, column ${column}): ${problem}`
      );
    }
  }
  slide.content = content;
  return slide;
}

function detectLayoutFromFileName(fileName, defaultLayouts) {
  let extname = '';
  let ext = '';
  while ((ext = path.extname(fileName))) {
    extname = ext + extname;
    if (defaultLayouts.hasOwnProperty(extname)) {
      return defaultLayouts[extname];
    }
    fileName = fileName.substr(0, fileName.length - ext.length);
  }
}

function fileToSlide({fileName, fileContent}, defaultLayouts) {
  let slide = {};
  try {
    slide = parseFile(fileContent);
  } catch (err) {
    logError(`Unable to process "${fileName}": ${err.message}`);
  }

  if (!slide.layout) {
    slide.layout = detectLayoutFromFileName(fileName, defaultLayouts);
  }
  return slide;
}

/**
 * Process all items in the folder path. Files inside folders are
 * considered to belong to a "chapter".
 *
 * The files are read and parsed for they YAML front matter. If there is no
 * "layout" meta-data entry, the slide layout is determined by the file type.
 *
 * @param {string} folderPath Path to the folder containing all slides
 */
export default function generateSlideObjects(folderPath, defaultLayouts) {
  let chapterIndex = 1;
  return readFolder(folderPath, true)
    .map(file => {
      if (Array.isArray(file)) {
        let slides = file.map(file => fileToSlide(file, defaultLayouts));
        let chapter = slides[0].chapter || 'Chapter ' + chapterIndex++;
        slides.map(slide => {
          if (!slide.chapter) {
            slide.chapter = chapter;
          }
          return slide;
        });
        return slides;
      }
      return fileToSlide(file, defaultLayouts);
    })
    .reduce(
      (list, content) => Array.isArray(content) ?
        list.concat(content) :
        (list.push(content), list),
      []
    );
}
