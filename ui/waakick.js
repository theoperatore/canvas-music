
// https://github.com/sebpiq/fields/blob/master/frontend/core/waa.js
// This must be executed on a user action, and will return a working audio context.
module.exports = function () {

  window.AudioContext = window.AudioContext
    ? window.AudioContext
    : window.webkitAudioContext;

  if (!window.AudioContext) {
    alert('GAH! This browser isn\'t hip enough for WebAudio!');
  }


  var audioContext = new AudioContext();
  var osc = audioContext.createOscillator();
  var gain = audioContext.createGain();
  gain.gain.value = 0;
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(0);
  osc.stop(1);
  return audioContext;
};
