import MarkdownHelper from '../js/MarkdownHelper';
import React from 'react';

export default class Markdown extends React.Component {
  shouldComponentUpdate(nextProps) {
    return this.props.value !== nextProps.value;
  }

  render() {
    let html = MarkdownHelper.parse(this.props.value);
    return <div dangerouslySetInnerHTML={{__html: html}} />;
  }
}
