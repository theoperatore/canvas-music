'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import hdcanvas from 'hd-canvas';
import waakick from './waakick';
import store from './state';

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
  distortion: null,
  gain: null,

  animPathIdx: 0,
  animPointIdx: 0,

  colors: [
    '#0074D9',
    '#7FDBFF',
    '#39CCCC',
    '#3D9970',
    '#2ECC40',
    '#01FF70',
    '#FFDC00',
    '#FF851B',
    '#FF4136',
    '#85144b',
    '#F012BE',
    '#B10DC9',
    '#111111',
    '#AAAAAA',
    '#DDDDDD',
  ],

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

  // distortion curve for the waveshaper, thanks to Kevin Ennis
  // http://stackoverflow.com/questions/22312841/waveshaper-node-in-webaudio-how-to-emulate-distortion
  makeDistortionCurve(amount) {
    var k = typeof amount === 'number' ? amount : 50,
      n_samples = 44100,
      curve = new Float32Array(n_samples),
      deg = Math.PI / 180,
      i = 0,
      x;
    for ( ; i < n_samples; ++i ) {
      x = i * 2 / n_samples - 1;
      curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
    }
    return curve;
  },

  startAudio(initFrequency) {
    if (!this.actx) {
      this.actx = waakick();
    }

    this.oscillator = this.actx.createOscillator();
    this.gain = this.actx.createGain();
    this.distortion = this.actx.createWaveShaper();

    this.distortion.curve = this.makeDistortionCurve(600);
    this.distortion.oversample = '16x';

    this.oscillator.connect(this.distortion);
    this.distortion.connect(this.gain);
    this.gain.connect(this.actx.destination);
    this.gain.gain.value = 0.9;

    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = initFrequency;
    this.oscillator.start(0); // start making noise
  },

  endAudio() {
    this.oscillator.stop(1);
  },

  handleStart(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    this.startAudio(ev.clientY);
    this.ctx.clearRect(0, 0, this.state.width, this.state.height);

    let x = ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX;
    let y = ev.changedTouches ? ev.changedTouches[0].clientY : ev.clientY;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);

    this.props.store.dispatch({ type: 'START_PATH', path: { points: [{x, y}] }});
    this.setState({ dragging: true });
  },

  handleEnd(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    this.ctx.closePath();
    this.endAudio();

    this.props.store.dispatch({ type: 'END_PATH', path: this.props.store.getState().currentPath });
    this.ctx.clearRect(0, 0, this.state.width, this.state.height);
    this.setState({ dragging: false });
  },

  handleDrag(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.state.dragging) {
      let { paths } = this.props.store.getState();
      let x = ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX;
      let y = ev.changedTouches ? ev.changedTouches[0].clientY : ev.clientY;
      let point = { x, y };

      let idx = paths.length % this.colors.length - 1;
      this.drawSegment(point, this.colors[idx]);

      this.props.store.dispatch({ type: 'ADD_POINT', point });
    }
  },

  engagePlayback(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    let { paths } = this.props.store.getState();
    let [ path ] = paths;

    this.ctx.beginPath();
    this.startAudio(path.points[0].y);
    this.ctx.moveTo(path.points[0].x, path.points[0].y);

    requestAnimationFrame(this.updateAnimation);
  },

  updateAnimation() {
    let { paths } = this.props.store.getState();
    if (this.animPathIdx >= paths.length) {
      this.endAudio();
      this.animPathIdx = 0;
      this.animPointIdx = 0;
      return;
    }

    requestAnimationFrame(this.updateAnimation);

    let currentPath = paths[this.animPathIdx];
    let currentPoint = currentPath.points[this.animPointIdx];
    let idx = this.animPathIdx % this.colors.length - 1;
    this.drawSegment(currentPoint, this.colors[idx]);

    if (this.animPointIdx + 1 >= currentPath.points.length) {
      this.animPathIdx += 1;
      this.animPointIdx = 0;
      this.ctx.closePath();
      this.ctx.beginPath();
    }
    else {
      this.animPointIdx += 1;
    }
  },

  drawSegment({x, y}, color = 'rebeccapurple') {
    this.oscillator.frequency.value = Math.abs(y / this.state.height) * 400;
    this.ctx.lineWidth = 5;
    this.ctx.strokeStyle = color;
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  },

  render() {
    let style = {
      'height': '100%',
      'width': '100%'
    }

    let buttonStyle = {
      'position': 'absolute',
      'top': '10px',
      'left': '10px',
    }

    let { paths } = this.props.store.getState();

    return (
      <div style={{ height: '100%', width: '100%' }}>
        <button
          style={buttonStyle}
          disabled={paths.length === 0}
          onClick={this.engagePlayback}
        >playback
        </button>
        <button
          style={{ 'position': 'absolute', top: '10px', left: '95px' }}
          disabled={paths.length === 0}
          onClick={() => {
            this.props.store.dispatch({ type: 'CLEAR_PATHS' });
            this.setState({ dragging: false });
            this.ctx.clearRect(0, 0, this.state.width, this.state.height);
          }}
        >clear playbacks
        </button>
        <canvas style={style} ref={cvs => this._cvs = cvs}></canvas>
      </div>
    )
  }
});

ReactDOM.render(<AudioCanvas store={store} />, mount);