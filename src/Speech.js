import React, { Component, PropTypes } from 'react';
import SpeechRecognition from 'react-speech-recognition';


class Speech extends Component {
  render () {
      const { transcript, resetTranscript, browserSupportsSpeechRecognition } = this.props;
      if (!browserSupportsSpeechRecognition) {
          return null;
        }
      return (
            <div>
                <button onClick={resetTranscript}>Reset</button>
                <span>{transcript}</span>
            </div>
        );
    }
}

Speech.propTypes = {
    transcript: PropTypes.string,
    resetTranscript: PropTypes.func,
    browserSupportsSpeechRecognition: PropTypes.bool
};


export default SpeechRecognition(Speech);



