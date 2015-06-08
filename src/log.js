import path from 'path';
import chalk from 'chalk';

const cwd = process.cwd();
export const error = chalk.bold.red;
const info = chalk.bold.green;
const add = chalk.blue;
const remove = chalk.red;

export function logMove(from, to) {
  process.stdout.write(
    add(`  - ${path.relative(cwd, from)} -> ${path.relative(cwd, to)}\n`)
  );
}

export function logDelete(p) {
  process.stdout.write(remove(`Deleted ${path.relative(cwd, p)}\n`));
}

export function logList(paths) {
  paths.forEach(
    p => process.stdout.write(add(`  - ${path.relative(cwd, p)}\n`))
  );
}

export function logWrite(p) {
  process.stdout.write(add(`  -> ${path.relative(cwd, p)}\n`));
}

export function logError(err) {
  process.stderr.write(error(`\n${err.toString()}\n`));
}

export function logInfo(msg) {
 process.stdout.write(info(msg));
}

export function logProgress(msg, promise) {
  if (msg && typeof msg !== 'string') {
    promise = msg;
    msg = null;
  }
  if (msg) {
    logInfo(msg + ': ');
  }
  let timer = setInterval(() => logInfo('.'), 1000);
  promise.then(
    () => {
      clearTimeout(timer);
      logInfo(' done\n');
    },
    () => {
      clearTimeout(timer);
      logError(' error!\n');
    }
  );
  return promise;
}
