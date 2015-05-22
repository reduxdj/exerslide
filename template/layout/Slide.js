import React from 'react';

export default class Slide extends React.Component {
  static getClassNames() {
    return '';
  }

  render() {
    let children;
    if (React.Children.count(this.props.children) > 0) {
      children = this.props.children;
    } else {
      children = <div dangerouslySetInnerHTML={{__html: this.props.content}} />;
    }

    return (
      <div id="slide">
        {this.props.title ? <h2>{this.props.title}</h2> : null}
        {children}
      </div>
    );
  }
};

Slide.propTypes = {
  content: React.PropTypes.string
};
