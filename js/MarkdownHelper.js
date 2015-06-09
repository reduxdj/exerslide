import kramed from 'kramed';
import hljs from '../vendor/highlight/highlight.pack.js';

let cache = Object.create(null);

kramed.setOptions({
  highlight: code => hljs.highlightAuto(code).value
});

export default {
  parse(markdown) {
    return cache[markdown] || (cache[markdown] = kramed(markdown));
  }
};
