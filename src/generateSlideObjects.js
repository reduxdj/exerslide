import fs from 'fs';
import path from 'path';
import yaml from 'yaml-js';
import _ from 'lodash';

const DIVIDER = /^-{3,}\n+/m;
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
  // try to find YAML front matter
  if (DIVIDER.test(fileContent)) {
    let frontMatter = '';
    let content = '';
    let match = DIVIDER.exec(fileContent);
    if (match) {
      frontMatter = fileContent.substr(0, match.index);
      content = fileContent.substr(match.index + match[0].length);
    } else {
      content = fileContent;
    }
    let slide = {};
    if (frontMatter) {
      try {
        slide = yaml.load(frontMatter);
      } catch(e) {
        slide = {};
      }
    }
    slide.content = content;
    return slide;
  }
  return {content: fileContent};
}

function detectLayoutFromFileName(fileName, defaultLayouts) {
  return defaultLayouts[path.extname(fileName)];
}

function fileToSlide({fileName, fileContent}, defaultLayouts) {
  let slide = parseFile(fileContent);
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
          if (!slide.chapter && !slide.single) {
            slide.chapter = chapter;
          }
          return slide;
        });
        return slides;
      }
      return fileToSlide(file);
    })
    .reduce(
      (list, content) => Array.isArray(content) ?
        list.concat(content) :
        (list.push(content), list),
      []
    );
}
