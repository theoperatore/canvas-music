'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import hdcanvas from 'hd-canvas';
import waakick from './waakick';

const mount = document.querySelector('#mount');


// Idea: Different touches mean different sounds, different touch start areas mean different sounds:
// two+ touches are dubstep wub wubs, touch + hold = reverse breath with short stop, tap is snare hit,
// tap on bottom half is kick drum, two+ touchstarts + touchmove = wub wub distortion (closer touches = faster wubwubs)
// record interactions on server? playback? art component?
const AudioCanvas = React.createClass({
  displayName: 'AudioCanvas',

  _cvs: null, // canvas ref
  cvs: null,  // canvas elem
  ctx: null,  // drawing ctx
  actx: null, // audio context
  oscillator: null,
  gain: null,

  getInitialState() {
    return {
      dragging: false,
      width: 0,
      height: 0
    }
  },

  componentDidMount() {
    let cvs = ReactDOM.findDOMNode(this._cvs);
    let width = cvs.getBoundingClientRect().width;
    let height = cvs.getBoundingClientRect().height;

    this.cvs = hdcanvas(cvs, width, height);
    this.ctx = this.cvs.getContext('2d');

    this.cvs.addEventListener('mousedown', this.handleStart);
    this.cvs.addEventListener('mousemove', this.handleDrag);
    this.cvs.addEventListener('mouseup', this.handleEnd);

    this.cvs.addEventListener('touchstart', this.handleStart);
    this.cvs.addEventListener('touchmove', this.handleDrag);
    this.cvs.addEventListener('touchend', this.handleEnd);

    this.setState({ width, height });
  },

  componentWillUnmount() {
    this.cvs.removeEventListener('mousedown', this.handleStart);
    this.cvs.removeEventListener('mousemove', this.handleDrag);
    this.cvs.removeEventListener('mouseup', this.handleEnd);

    this.cvs.removeEventListener('touchstart', this.handleStart);
    this.cvs.removeEventListener('touchmove', this.handleDrag);
    this.cvs.removeEventListener('touchend', this.handleEnd);
  },

  handleStart(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    if (!this.actx) {
      this.actx = waakick();
    }

    this.oscillator = this.actx.createOscillator();
    this.gain = this.actx.createGain();

    this.oscillator.connect(this.gain);
    this.gain.connect(this.actx.destination);
    this.gain.gain.value = 0.9;

    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = ev.clientY;
    this.oscillator.start(0);


    let x = ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX;
    let y = ev.changedTouches ? ev.changedTouches[0].clientY : ev.clientY;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);

    this.setState({ dragging: true });
  },

  handleEnd(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    this.ctx.closePath();
    this.oscillator.stop(1);
    this.setState({ dragging: false });
  },

  handleDrag(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.state.dragging) {
      let x = ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX;
      let y = ev.changedTouches ? ev.changedTouches[0].clientY : ev.clientY;

      this.oscillator.frequency.value = Math.abs(y / this.state.height) * 5000;
      this.ctx.lineTo(x, y);

      this.ctx.lineWidth = 5;
      this.ctx.strokeStyle = 'rebeccapurple';
      this.ctx.stroke();
    }
  },

  render() {
    let style = {
      'height': '100%',
      'width': '100%'
    }

    return <canvas style={style} ref={cvs => this._cvs = cvs}></canvas>
  }
});

ReactDOM.render(<AudioCanvas />, mount);