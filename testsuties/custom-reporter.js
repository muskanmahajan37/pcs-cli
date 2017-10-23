const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const TestUtils = require('./testUtils')

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
    const failedResult = testResult.testResults.filter((m) => m.status == 'failed');

    if (failedResult && failedResult.length > 0) {
      const failedService = Array.from(new Set(failedResult.map((m) => m.title)));
      failedService.forEach((m) => {
        const service = TestUtils.loadConfigByDisplayName(m);
        // add head message
        let content = 'Display Name: ' + m + '\r\n';
        content += 'Service Url: ' + service.serviceUrl + '\r\n';
        content += 'Test Suite: ' + service.testSuite + '\r\n';
        content += 'Reference Spec: ' + service.apiSpec + '\r\n\r\n';

        // add failed test message
        failedResult.filter((n) => n.title == m).forEach((n => {
          const messageContent = JSON.parse(n.failureMessages[0]);
          const request = messageContent.request;
          const response = messageContent.response;
          content += messageContent.apiMessage.description + '\r\n';
          content += 'route: ' + messageContent.apiMessage.apiRouteTemplate + '\r\n';
          content += request.method + ' ' + request.url + '\r\n';
          if (request.body) {
            content += 'Content: ' + '\r\n' + JSON.stringify(request.body, null, 2) + '\r\n';
          }
          content += 'Response: \r\nStatus Code: ' + response.statusCode + '\r\n'
          if (response.body) {
            content += 'Content: ' + '\r\n' + JSON.stringify(JSON.parse(response.body), null, 2);
          }
          content += '\r\n\r\n';
        }));

        fs.appendFile(this._directory + '/' + m + '.err', content, (err) => {
          if (err) throw err;
        });
      });
    }
  }

  onRunComplete(contexts, results) {
    let content = '';
    let titleSet = new Set();
    let trc = [];
    results.testResults.forEach((element) => {
      element.testResults.forEach((n) => {
        titleSet.add(n.title);
        trc.push(n);
      });
    });
    titleSet.forEach((m) => {
      const passed = trc.filter((n) => n.title == m && n.status == 'passed').length;
      const failed = trc.filter((n) => n.title == m && n.status == 'failed').length;
      const total = trc.filter((n) => n.title == m).length;
      content += m + ': ' + passed + ' passed ' + failed + ' failed. total ' + total + '\r\n';
    });
    fs.appendFile(this._directory + '/summary.log', content, (err) => {
      if (err) throw err;
    });
  }

}

module.exports = CustomReporter;