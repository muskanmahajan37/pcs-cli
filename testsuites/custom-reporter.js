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
      const failedService = Array.from(new Set(failedResult.map((m) => TestUtils.getServiceApiDescription(m.title).name)));
      failedService.forEach((m) => {
        const service = TestUtils.loadConfigByDisplayName(m);
        // add head message
        let content = 'Display Name: ' + m + '\r\n';
        content += 'Service Url: ' + service.serviceUrl + '\r\n';
        content += 'Test Suite: ' + service.testSuite + '\r\n';
        content += 'Reference Spec: ' + service.apiSpec + '\r\n\r\n';

        // add failed test message
        failedResult.filter((n) => TestUtils.getServiceApiDescription(n.title).name == m).forEach((n => {
          const messageContent = JSON.parse(n.failureMessages[0]);
          const request = messageContent.request;
          const response = messageContent.response;
          content += TestUtils.getServiceApiDescription(n.title).description + '\r\n';
          content += 'route: ' + n.ancestorTitles[n.ancestorTitles.length - 1] + '\r\n';
          content += request.method + ' ' + request.url + '\r\n';
          if (request.body) {
            content += 'Content: ' + '\r\n' + JSON.stringify(request.body, null, 2) + '\r\n';
          }
          content += 'Response: \r\nStatus Code: ' + response.statusCode + '\r\n'
          let body = response.body;
          if (body) {
            if(typeof body === 'string'){
              body = JSON.parse(body);
            }
            content += 'Content: ' + '\r\n' + JSON.stringify(body, null, 2);
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
        titleSet.add(TestUtils.getServiceApiDescription(n.title).name);
        trc.push(n);
      });
    });
    titleSet.forEach((m) => {
      const passed = trc.filter((n) => TestUtils.getServiceApiDescription(n.title).name == m && n.status == 'passed').length;
      const failed = trc.filter((n) => TestUtils.getServiceApiDescription(n.title).name == m && n.status == 'failed').length;
      const total = trc.filter((n) => TestUtils.getServiceApiDescription(n.title).name == m).length;
      content += m + ': ' + passed + ' passed ' + failed + ' failed. total ' + total + '\r\n';
    });
    fs.appendFile(this._directory + '/summary.log', content, (err) => {
      if (err) throw err;
    });
  }

}

module.exports = CustomReporter;