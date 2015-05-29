import Dispatcher from './Dispatcher';

const ACTIONS = {
  SET_SLIDES: 'set-slides',
  SET_SLIDE_INDEX: 'set-slide-index',
  FORWARD: 'forward',
  BACK: 'back'
};

export {
  ACTIONS
}

function getHash() {
  let index = Number(global.location.hash.substring(1));
  return isNaN(index) ? 0 : index;
}

export default {

  setSlides(slides) {
    Dispatcher.dispatch({
      type: ACTIONS.SET_SLIDES,
      payload: {
        slides
      }
    });
  },

  forward() {
    Dispatcher.dispatch({
      type: ACTIONS.FORWARD
    });
  },

  back() {
    Dispatcher.dispatch({
      type: ACTIONS.BACK
    });
  },

  transitionFromURL(currentIndex) {
    let newIndex = getHash();
    if (currentIndex !== newIndex) {
      Dispatcher.dispatch({
        type: ACTIONS.SET_SLIDE_INDEX,
        payload: newIndex
      });
    }
  },
};
