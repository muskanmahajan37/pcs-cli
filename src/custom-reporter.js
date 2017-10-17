class CustomReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
    const moment = require('moment');
    this.filePrefix = moment().format('YYYY-MM-DD HH-mm-ss');
  }

  onTestResult(test, testResult, aggregatedResult) {
    const fs = require('fs');
    let result = "";
    for (const key in testResult.testResults) {
      if (testResult.testResults.hasOwnProperty(key)) {
        const element = testResult.testResults[key];
        if (element.status == 'passed') {
          result += 'passed ' + element.fullName + '\r\n\r\n';
          continue;
        }
        result += 'error ' + element.fullName + '\r\n';
        result += '\t' + element.failureMessages + '\r\n\r\n';
      }
    }
    const path = require('path');
    const testFileName = path.win32.basename(testResult.testFilePath, '.ts');
    const logpath = './report/' + this.filePrefix + testFileName + 'outlog' + '.txt';
    fs.appendFile(logpath, result, (err) => {
      if (err) {
        console.error('failed to log at ' + logpath);
      }
    });
  }

  onRunComplete(contexts, results) {
    const fs = require('fs');
    let result = "";
    result += 'total: ' + results.numTotalTests + '\r\n';
    result += 'failed: ' + results.numFailedTests + '\r\n';
    result += 'success: : ' + results.numPassedTests + '\r\n';
    const logpath = './report/' + this.filePrefix + 'summaryoutlog' + '.txt';
    fs.appendFile(logpath, result, (err) => {
      if (err) {
        console.error('failed to log ' + logpath);
      }
    });
  }

}

module.exports = CustomReporter;