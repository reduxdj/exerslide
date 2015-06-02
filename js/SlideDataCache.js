let cache = [];

export default {
  get(slideIndex, key, defaultData) {
    let result;
    if (cache.hasOwnProperty(slideIndex) &&
        cache[slideIndex].hasOwnProperty(key)) {
      result = cache[slideIndex][key];
    }
    if (result == null) {
      this.set(slideIndex, key, defaultData);
      result = defaultData;
    }
    return result;
  },

  set(slideIndex, key, data) {
    let slideCache = cache[slideIndex];
    if (!slideCache) {
      slideCache = cache[slideIndex] = {};
    }
    slideCache[key] = data;
  },

  getAll(key) {
    return cache.map(cache => cache[key]).filter(data => data);
  }
};
