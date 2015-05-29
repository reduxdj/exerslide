import SlideStore from './SlideStore';
import * as Layouts from '${LAYOUTS_FILE}';

export function getLayoutForSlide(slideObj) {
  return slideObj.layout && Layouts[slideObj.layout];
}

export function getLayoutForSlideAt(slideIndex) {
  return getLayoutForSlide(SlideStore.getSlideAt(slideIndex));
}
