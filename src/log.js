import path from 'path';
import chalk from 'chalk';

const cwd = process.cwd();
export const error = chalk.bold.red;
const info = chalk.bold.green;
const add = chalk.blue;
const remove = chalk.red;

export function logMove(from, to) {
  process.stdout.write(
    add(`Copied ${path.relative(cwd, from)} -> ${path.relative(cwd, to)}\n`)
  );
}

export function logDelete(p) {
  process.stdout.write(remove(`Deleted ${path.relative(cwd, p)}\n`));
}

export function logWrite(p) {
  process.stdout.write(add(`Updated ${path.relative(cwd, p)}\n`));
}

export function logError(err) {
  process.stderr.write(error(`${err.toString()}\n`));
}

export function logInfo(msg) {
 process.stdout.write(info(msg + '\n'));
}
