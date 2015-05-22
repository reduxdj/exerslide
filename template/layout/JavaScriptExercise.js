/*eslint no-new-func: 0, new-cap: 0*/
import Editor from '../js/Editor';
import Immutable from 'immutable';
import Markdown from '../js/Markdown';
import React from 'react';
import Slide from './Slide';
import chai from 'chai';
import classnames from 'classnames';
import withoutComments from '../js/withoutComments';

import 'codemirror/mode/javascript/javascript';


let ExerciseRecord = Immutable.Record({
  completed: false,
  error: null,
  code: ''
});
let cache = Immutable.Map();

function ensure(index) {
  if (!cache.has(index)) {
    cache = cache.set(index, new ExerciseRecord());
  }
  return cache.get(index);
}

function createAssertion(code) {
  return new Function('assert, source, output', code);
}

function log() {
  console.log.apply(console, arguments);
}
global.log = log;

export default class JavaScriptExercise extends React.Component {

  static getClassNames(slideIndex) {
    let exercise = cache.get(slideIndex);
    return classnames(
      Slide.getClassNames(slideIndex),
      {
        javascriptExercise: true,
        completed: exercise && exercise.completed,
        error: exercise && exercise.error
      }
    );
  }

  constructor(props) {
    super(props);
    this.state = {
      exercise: ensure(props.slideIndex)
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.slideIndex !== this.props.slideIndex) {
      return true;
    }
    let thisExercise = this.state.exercise;
    let nextExercise = nextState.exercise;
    return thisExercise.completed !== nextExercise.completed ||
      thisExercise.error !== nextExercise.error;
  }

  reset() {
    this.refs.editor.setValue(this.props.content);
    let exercise = this.state.exercise
      .set('completed', false)
      .set('error', '');
    cache = cache.set(this.props.slideIndex, exercise);
    this.setState({exercise});
  }

  runCode() {
    let code = this.refs.editor.getValue();
    let func = new Function('log, console', code);
    func(log, console);
  }

  submitCode() {
    let code = this.refs.editor.getValue();
    let assertion = createAssertion(this.props.assertion);
    let output = [];
    try {
      let func = new Function('log, console', code);
      let realLog = console.log;
      let log = function log() {
        output.push.apply(output, arguments);
        realLog.apply(console, arguments);
      };
      console.log = log;
      func(log, console);
      console.log = realLog;
      assertion(chai.assert, withoutComments(code), output);

      cache = cache.updateIn(
        [this.props.slideIndex],
        cache => cache.set('error', '').set('completed', true)
      );
    } catch(ex) {
      let error = ex.name + ': ' + ex.message;
      cache = cache.updateIn(
        [this.props.slideIndex],
        cache => cache
          .set('error', error)
          .set('completed', false)
      );
      console.error(error);
    }
    this.setState({exercise: cache.get(this.props.slideIndex)});
  }

  _onChange(code) {
    cache = cache.setIn([this.props.slideIndex, 'code'], code);
    this.setState({exercise: cache.get(this.props.slideIndex)});
  }

  componentWillReceiveProps(newProps) {
    this.setState({exercise: ensure(newProps.slideIndex)});
  }

  render() {
    let message;
    let description;
    if (this.props.description) {
      description =
        <div
          dangerouslySetInnerHTML={
            {__html: Markdown.parse(this.props.description)}
          }
        />;
    }
    let exercise = this.state.exercise;

    if (exercise.completed) {
      message =
        <div className="alert alert-success">
          <strong>Well done!</strong>
        </div>;
    } else if (exercise.error) {
      message =
        <div className="alert alert-danger">
          <strong>Oh no :(</strong><br />
          {exercise.error}
        </div>;
    }
    return (
      <Slide title={this.props.title}>
        {description}
        {this.props.solution}
        <Editor
          ref="editor"
          mode="javascript"
          defaultValue={exercise.code || this.props.content}
          onChange={this._onChange.bind(this)}
        />
        <div className="toolbar">
          <button
            style={{margin: 5}}
            className="btn btn-primary"
            onClick={this.runCode.bind(this)}>
            Run
          </button>
          <button
            style={{margin: 5}}
            className="btn btn-default"
            onClick={this.reset.bind(this)}>
            Reset
          </button>
          {this.props.assertion ?
            <button
              style={{margin: 5}}
              className="btn btn-success"
              onClick={this.submitCode.bind(this)}>
              Submit
            </button> :
            null
          }
        </div>
        {message ? <div style={{marginTop: 20}}>{message}</div> : null}
      </Slide>
    );
  }

}
