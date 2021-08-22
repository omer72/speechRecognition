import React ,{Component} from 'react';
import _ from 'underscore';

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

// the UI component for filtering the subway entrances by subway line

class Filter extends Component {
  constructor(props) {
    super(props);
    this.state = {
      parshText: "Listening...."
    };
    this.testSpeech = this.testSpeech.bind(this);
  }

  testSpeech() {
    var srv = this;
    srv.setState({parshText : 'Listening....'});
    var grammar = "#JSGF V1.0; grammar phrase; public <phrase> = tower | fail | working | show | me | brooklyn | Jersey";
    var recognition = new SpeechRecognition();
    var speechRecognitionList = new SpeechGrammarList();
    speechRecognitionList.addFromString(grammar, 1);
    recognition.grammars = speechRecognitionList;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.start();
    recognition.onresult = function(event) {
      var speechResult = event.results[0][0].transcript;
      srv.setState({parshText : speechResult});
      srv.props.filterText(speechResult);
      console.log(srv.state.parshText);
      console.log('Confidence: ' + event.results[0][0].confidence);
    };
  }

  render () {
    const { filterLines ,filteredTowers} = this.props;
    let options = [];
      _.forEach(filteredTowers , function(e, k) {
          options.push(e.feature.properties.Address+' '+e.feature.properties.City);
      });

      return <div className="filterRadioTowers">
          <hr/>
          <h3>Nokia Towers</h3>
          <p>Filter by Tower Status</p>
          <select defaultValue="*"
                  type="select"
                  name="filterlines" style={{"maxWidth": 200}}
                  onChange={(e) => filterLines(e)}>
              {/* We render the select's option elements by mapping each of the values of subwayLines array to option elements */}
              {
                  options.map((line, i) => {
                      return (
                          <option value={line} key={i}>{line}</option>
                      );
                  }, this)
              }
          </select>
          <button onClick={this.testSpeech}>Start</button>
          <label> {this.state.parshText}</label>

      </div>;
  }
}

export default Filter;
