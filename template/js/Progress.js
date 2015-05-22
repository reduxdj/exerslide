import React from 'react';
import SlideStore from './SlideStore';
import {getLayoutForSlideAt} from './LayoutHelper';
import classnames from 'classnames';

class Indicator extends React.Component {
  shouldComponentUpdate(nextProps) {
    return nextProps.slideIndex !== this.props.slideIndex ||
      nextProps.active !== this.props.active;
  }

  render() {
    let {slideIndex, active} = this.props;
    let classes = {
      indicator: true,
      active
    };
    let Layout = getLayoutForSlideAt(slideIndex);

    return (
      <a
        href={'#' + this.props.slideIndex}
        className={classnames(classes, Layout.getClassNames(slideIndex))}>
        <span>Slide {slideIndex + 1}</span>
      </a>
    );
  }
}

Indicator.propTypes = {
  slideIndex: React.PropTypes.number,
  active: React.PropTypes.bool
};

export default class Progress extends React.Component {
  render() {
    let chapters = SlideStore.getSlidesGroupedByChapter();
    let slideIndex = 0;
    chapters = chapters.map(chapter => {
      let indicators;
      if (Array.isArray(chapter)) {
        indicators = chapter.map((slide, index) =>
          <Indicator
            key={slideIndex + index}
            slideIndex={slideIndex + index}
            active={this.props.slideIndex === slideIndex + index}
          />
        );
        slideIndex += chapter.length;
      } else {
        indicators =
          <Indicator
            key={slideIndex}
            slideIndex={slideIndex}
            active={this.props.slideIndex === slideIndex}
          />;
        slideIndex += 1;
      }
      return (
        <div className="chapter">
          <div className="title">
            {Array.isArray(chapter) ? chapter[0].chapter : chapter.title}
          </div>
          <div className="indicators">{indicators}</div>
        </div>
      );
  });

    return (
      <div id="progress">
        {chapters}
      </div>
    );
  }
}

Progress.propTypes = {
  slideIndex: React.PropTypes.number
};
