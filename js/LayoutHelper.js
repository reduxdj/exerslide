import SlideStore from './SlideStore';
import {Layouts} from './config';

export function getLayoutForSlide(slideObj) {
  return slideObj.layout && Layouts[slideObj.layout];
}

export function getLayoutForSlideAt(slideIndex) {
  return getLayoutForSlide(SlideStore.getSlideAt(slideIndex));
}
