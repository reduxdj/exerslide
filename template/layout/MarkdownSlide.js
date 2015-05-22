import React from 'react';
import Slide from './Slide';
import kramed from 'kramed';

export default class MarkdownSlide extends React.Component {
  render() {
    return (
      <Slide
        title={this.props.title}
        content={kramed(this.props.content)}
      />
    );
  }
};

MarkdownSlide.propTypes = {
  content: React.PropTypes.string
};
