import {EventEmitter} from 'events';
import Dispatcher from './Dispatcher';
import {ACTIONS} from './Actions';

const EVENTS = {
  CHANGE: 'change',
  TRANSITION: 'transition'
};

export {EVENTS};

class SlideStore extends EventEmitter {
  constructor() {
    super();
    this._currentIndex = 0;
    Dispatcher.register(this._update.bind(this));
  }

  _update(action) {
    let {payload} = action;

    switch (action.type) {
      case ACTIONS.SET_SLIDES:
        this._slides = payload.slides;
        this.emit(EVENTS.CHANGE);
        break;

      case ACTIONS.FORWARD:
        if (this._currentIndex < this._slides.length - 1) {
          this._currentIndex += 1;
          this.emit(EVENTS.TRANSITION);
        }
        break;

      case ACTIONS.BACK:
        if (this._currentIndex > 0) {
          this._currentIndex -= 1;
          this.emit(EVENTS.TRANSITION);
        }
        break;

      case ACTIONS.SET_SLIDE_INDEX:
        if (!this._slides ||
            payload >= this._slides.length ||
            payload < 0 ) {
          return;
        }
        this._currentIndex = payload;
        this.emit(EVENTS.TRANSITION);
        break;
    }
  }

  getCurrentSlide() {
    if (this._slides != null &&  this._currentIndex != null) {
      return this._slides[this._currentIndex];
    }
    return null;
  }

  getCurrentIndex() {
    return this._currentIndex;
  }
}

export default new SlideStore();
