import SlideStore from './SlideStore';
import * as Layouts from '${LAYOUTS_FILE}';

export function getLayoutForSlide(slideObj) {
  return Layouts[slideObj.layout];
}

export function getLayoutForSlideAt(slideIndex) {
  return Layouts[SlideStore.getSlideAt(slideIndex).layout];
}
