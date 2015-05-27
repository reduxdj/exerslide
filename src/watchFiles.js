import chokidar from 'chokidar';
import path from 'path';
import {logInfo} from './log';

const cwd = process.cwd();

function relative(p) {
  if (Array.isArray(p)) {
    return p.map(p => path.relative(cwd, p)).join(', ');
  }
  return path.relative(cwd, p);
}

export default function watchFiles(root, handler) {
  logInfo(`Watching "${relative(root)}"...`);
  return chokidar.watch(root, {ignoreInitial: true}).on('all', handler);
}
