const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');

class CustomReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
    const moment = require('moment');
    this._directory = './report/' + moment().format('YYYY-MM-DD HH-mm-ss');
    mkdirp.sync(this._directory);
  }

  onTestResult(test, testResult, aggregatedResult) {
    if (testResult.numFailingTests < 1) return;

    // add head message
    const fstresult = JSON.parse(testResult.testResults[1].failureMessages[0]);
    const testSuite = path.basename(testResult.testFilePath, '.ts');
    let content = 'Display Name: ' + fstresult.service.displayName + '\r\n';
    content += 'Service Url: ' + fstresult.service.serviceUrl + '\r\n';
    content += 'Test Suite: ' + testSuite + '\r\n';
    content += 'Reference Spec: ' + fstresult.service.displayName + '\r\n\r\n';

    // add failed test message
    for (var index = 0; index < testResult.testResults.length; index++) {
      var element = testResult.testResults[index];
      if (element.status != 'failed') continue;
      const messageContent = JSON.parse(element.failureMessages[0]);
      content += messageContent.description + '\r\n';
      content += messageContent.httpMethod + ' ' + messageContent.request.requestUrl + '\r\n';
      if (messageContent.request.body) {
        content += 'Request: ' + '\r\n' + messageContent.request.body;
      }
      content += 'Response: ' + '\r\n' + messageContent.reponse + '\r\n\r\n';
    }
    fs.appendFile(this._directory + '/' + testSuite + '.err', content, (err) => {
      if (err) throw err;
    });

  }

  onRunComplete(contexts, results) {
    let content = '';
    results.testResults.forEach((element) => {
      content += path.basename(element.testFilePath, '.test.ts') + element.numFailingTests + ' failed, ' +
        element.numPassingTests + ' passes, ' +
        (element.numFailingTests + element.numPassingTests) + ' total';
    });
    fs.appendFile(this._directory + '/summary.log', content, (err) => {
      if (err) throw err;
    });
  }

}

module.exports = CustomReporter;