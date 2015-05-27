import React from 'react';
import TOC from './js/TOC.js';

/**
 * The master layout specifies the different parts of the page, e.g. the
 * progress bar. The current slide is passed as child to it.
 */
export default class MasterLayout extends React.Component {
  render() {
    return (
      <div id="page">
        <TOC {...this.props} />
        {this.props.children}
      </div>
    );
  }
};

MasterLayout.propTypes = {
  /**
   * The index of the current slide
   */
  slideIndex: React.PropTypes.number,

  /**
   * All slides
   */
  slides: React.PropTypes.array
};

