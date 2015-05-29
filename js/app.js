import * as Layout from '${LAYOUTS_FILE}';
import Actions from './Actions';
import React from 'react';
import Slide from '../components/Slide';
import SlideStore, {EVENTS} from './SlideStore';
import MasterLayout from '${MASTER_LAYOUT_PATH}';
import {getLayoutForSlide} from './LayoutHelper';
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
        currentSlide: SlideStore.getCurrentSlide(),
        slides: SlideStore.getSlides()
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
    let {currentSlide, currentIndex} = this.state;
    if (currentSlide == null) {
      return null;
    }

    let Layout = getLayoutForSlide(currentSlide);
    let content;
    if (Layout) {
      let classNames =
        Layout.getClassNames && Layout.getClassNames(currentIndex);
      content =
        <Slide className={classNames} title={currentSlide.title}>
          <Layout
            {...currentSlide}
            slideIndex={this.state.currentIndex}
          />
        </Slide>;
    } else {
      content =
        <Slide
          title={currentSlide.title}
          content={currentSlide.content}
        />;
    }

    return (
      <div>
        <MasterLayout
          slideIndex={this.state.currentIndex}
          slides={this.state.slides}>
          {content}
       </MasterLayout>
      </div>
    );
  }
}

React.render(
  <App />,
  global.document.body
);
