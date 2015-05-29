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
      <div id="slide" className={this.props.className}>
        {this.props.title ?
          <h2
            className="title"
            dangerouslySetInnerHTML={{__html: this.props.title}}
          /> :
           null
        }
        {children}
      </div>
    );
  }
};

Slide.propTypes = {
  title: React.PropTypes.string,
  content: React.PropTypes.string
};
