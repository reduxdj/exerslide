import kramed from 'kramed';

let cache = Object.create(null);

export default {
  parse(markdown) {
    return cache[markdown] || (cache[markdown] = kramed(markdown));
  }
};
