import React from 'react';
import CodeMirror from 'codemirror';

/**
 * @css ../node_modules/codemirror/lib/codemirror.css
 */
export default class Editor extends React.Component {
  constructor(props) {
    super(Object.assign({defaultValue: ''}, props));
  }

  shouldComponentUpdate() {
    return false;
  }

  componentDidMount() {
    this.codeMirror = CodeMirror( // eslint-disable-line new-cap
      React.findDOMNode(this),
      {
        mode: this.props.mode,
        value: this.props.defaultValue,
        lineNumbers: true
      }
    );

    if (this.props.onChange) {
      this.codeMirror.on('change', this.onChange.bind(this));
    }
    this.codeMirror.on('keyup', function(cm, event) {
      event.stopPropagation();
    });
    this.codeMirror.on('keypress', function(cm, event) {
      event.stopPropagation();
    });
    this.codeMirror.on('keydown', function(cm, event) {
      event.stopPropagation();
    });
  }

  onChange() {
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => this.props.onChange(this.codeMirror.getValue()),
      200
    );
  }

  render() {
    return <div className="editor" />;
  }

  reset() {
    this.codeMirror.setValue(this.props.defaultValue);
  }

  getValue() {
    return this.codeMirror.getValue();
  }

  setValue(value) {
    this.codeMirror.setValue(value);
  }
}

Editor.propTypes = {
  defaultValue: React.PropTypes.string,
  mode: React.PropTypes.string
};
