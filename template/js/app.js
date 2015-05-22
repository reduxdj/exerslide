import React from 'react';
import Actions from './Actions';
import SlideStore, {EVENTS} from './SlideStore';
import * as Layout from '${LAYOUTS_FILE}';
import {keypress} from 'keypress';

let fs = require('fs'); // to make brfs happy

function setHash(v) {
  global.location.hash = v;
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentIndex: 0,
      currentSlide: null
    };
  }

  componentWillMount() {
    SlideStore.on(EVENTS.CHANGE, () => {
      this.setState({
        currentIndex: SlideStore.getCurrentIndex(),
        currentSlide: SlideStore.getCurrentSlide()
      });
    });

    SlideStore.on(EVENTS.TRANSITION, () => {
      setHash(SlideStore.getCurrentIndex());
      this.setState({
        currentIndex: SlideStore.getCurrentIndex(),
        currentSlide: SlideStore.getCurrentSlide()
      });
    });

    global.onhashchange = () => {
      Actions.transitionFromURL(this.state.currentIndex);
    };

    Actions.setSlides(JSON.parse(fs.readFileSync('${SLIDES_FILE}', 'utf-8')));
    Actions.transitionFromURL(0);
  }

  componentDidMount() {
    this._listener = new keypress.Listener();
    this._listener.simple_combo('right', Actions.forward);
    this._listener.simple_combo('left', Actions.back);
  }

  render() {
    if (this.state.currentSlide == null) {
      return (
        <div className="loaderContainer">
          <div className="spinner" />
        </div>
      );
    }

    let Slide = Layout[this.state.currentSlide.layout];

    return (
      <Slide
        {...this.state.currentSlide}
        slideIndex={this.state.currentIndex}
      />
    );
  }
}

React.render(
  <App />,
  global.document.body
);
