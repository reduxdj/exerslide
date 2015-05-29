import React from 'react';
import Markdown from '../js/Markdown';

export default class MarkdownSlide extends React.Component {
  static getClassNames() {
    return 'markdown';
  }

  render() {
    return (
      <div
        dangerouslySetInnerHTML={{__html: Markdown.parse(this.props.content)}}
      />
    );
  }
};

MarkdownSlide.propTypes = {
  content: React.PropTypes.string
};
