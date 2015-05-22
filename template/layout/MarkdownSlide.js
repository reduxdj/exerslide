import React from 'react';
import Slide from './Slide';
import Markdown from '../js/Markdown';
import classnames from 'classnames';

export default class MarkdownSlide extends React.Component {
  static getClassNames(slideIndex) {
    return classnames(Slide.getClassNames(slideIndex), 'markdown');
  }

  render() {
    return (
      <Slide
        {...this.props}
        content={Markdown.parse(this.props.content)}
      />
    );
  }
};

MarkdownSlide.propTypes = {
  content: React.PropTypes.string
};
