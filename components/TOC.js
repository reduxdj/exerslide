import React from 'react';
import SlideStore from '../js/SlideStore';
import {getLayoutForSlideAt} from '../js/LayoutHelper';
import classnames from 'classnames';

class MenuItem extends React.Component {
  shouldComponentUpdate(nextProps) {
    return nextProps.slideIndex !== this.props.slideIndex ||
      nextProps.active !== this.props.active;
  }

  componentDidUpdate() {
    if (this.props.active) {
      React.findDOMNode(this).scrollIntoView(false);
      React.findDOMNode(this.refs.anchor).focus();
    }
  }

  render() {
    let {slideIndex, slide, active} = this.props;
    let classes = {
      slide: true,
      active
    };
    let Layout = getLayoutForSlideAt(slideIndex);
    let layoutClasses =
      Layout && Layout.getClassNames && Layout.getClassNames(slideIndex);
    let title = slide.toc || slide.title || `Slide ${slideIndex + 1}`;

    return (
      <li
        className={
          classnames(classes, layoutClasses)
        }>
        <a
          ref="anchor"
          tabIndex={this.props.active ? 0 : -1}
          title={title}
          href={'#' + this.props.slideIndex}>
          <span className="title">{title}</span>
        </a>
      </li>
    );
  }
}

MenuItem.propTypes = {
  slideIndex: React.PropTypes.number,
  slide: React.PropTypes.object,
  active: React.PropTypes.bool
};

export default class TOC extends React.Component {
  render() {
    let {slides} = this.props;
    let chapters = SlideStore.getSlidesGroupedByChapter();
    let slideIndex = 0;
    chapters = chapters.map(chapter => {
      let menuItems;
      if (Array.isArray(chapter)) {
        let isActive = this.props.slideIndex >= slideIndex &&
          this.props.slideIndex < slideIndex + chapter.length;
        menuItems = chapter.map((slide, index) =>
          <MenuItem
            key={slideIndex + index}
            slideIndex={slideIndex + index}
            slide={slides[slideIndex + index]}
            active={this.props.slideIndex === slideIndex + index}
          />
        );
        menuItems =
          <li
            key={chapter[0].chapter}
            className={classnames({
              chapter: true,
              active: isActive
            })}>
            <h4 className="title">
              {chapter[0].chapter}
            </h4>
            <ul className="slides">{menuItems}</ul>
          </li>;
        slideIndex += chapter.length;
      } else {
        menuItems =
          <MenuItem
            key={slideIndex}
            slide={slides[slideIndex]}
            slideIndex={slideIndex}
            active={this.props.slideIndex === slideIndex}
          />;
        slideIndex += 1;
      }
      return menuItems;
  });

    return (
      <ul id="toc">
        {chapters}
      </ul>
    );
  }
}

TOC.propTypes = {
  slideIndex: React.PropTypes.number,
  slides: React.PropTypes.array,
};
