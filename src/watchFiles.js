import chokidar from 'chokidar';
import path from 'path';
import {logList} from './log';

const cwd = process.cwd();

export function relative(p) {
  if (Array.isArray(p)) {
    return p.map(p => path.relative(cwd, p)).join(', ');
  }
  return path.relative(cwd, p);
}

export default function watchFiles(root, handler) {
  logList(!Array.isArray(root) ? [root] : root);
  return chokidar.watch(root, {ignoreInitial: true}).on('all', handler);
}
