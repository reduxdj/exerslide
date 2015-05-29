/**
 * This function accepts a piece of JS code and removes all comments it
 * contains.
 */
export default function removeComments(code) {
  // temporarily remove strings
  let token = '%%' + Date.now();
  let strings = {};
  let counter = 0;
  code = code.replace(/(['"])(?:(?:\\\1|[^\1])*)\1/g, match => {
    let t = token + '_' + counter++;
    strings[t] = match;
    return t;
  });

  // Remove line comments
  code = code.replace(/\/\/.*$/mg, '');
  // Remove block comments
  code = code.replace(/\/\*(?:(?!\*\/)[\S\s])+\*\//g, '');

  // put strings back
  return code.replace(new RegExp(token + '_\\d+', 'g'), m => strings[m]);
}
