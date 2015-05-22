#!/usr/bin/env node

var nomnom = require('nomnom');
var exerslide = require('../lib');

var opts = nomnom
  .script('exerslide')
  .options({
    path: {
      position: 0,
      help: 'Path to slides to convert',
      required: true,
    },
    outDir: {
      abbr: 'o',
      full: 'out-dir',
      default: './',
      metavar: 'DIR',
      help: 'Directory to save the presentation in'
    },
    watch: {
      abbr: 'w',
      flag: true,
      help: 'Monitor slides and static files for changes'
    }
  })
  .parse();

exerslide(opts);
