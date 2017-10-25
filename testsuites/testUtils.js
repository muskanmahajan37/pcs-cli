TestUtils = {
    loadConfig: (suiteName) => {
        let config = require('./testsuites-config.json');
        return config.filter(element => {
            return element.testSuite === suiteName;
        });
    },

    loadConfigByDisplayName: (displayName) => {
        let config = require('./testsuites-config.json');
        return config.filter(element => {
            return element.displayName === displayName;
        })[0];
    },

    loadDeployment: () => {
        const fs = require('fs');
        const inquirer = require('inquirer');
        const configTemplate = require('./testsuites-config-template.json');
        const configFile = 'testsuites/testsuites-config.json';

        let deployments = [];
        let files = [];
        if (fs.existsSync('./deployments')) {
            files = fs.readdirSync('./deployments');
        }

        files.forEach(f => {
            deployments.push({ name: f, value: require('../deployments/' + f), short: f });
        });
        deployments.push({ name: 'Will input target service uri...', value: null, short: 'none' });

        let chooseDeploymentQuestion = [{
            name: 'chooseDeployment',
            type: 'list',
            message: 'please choose target deployment to run api test:',
            choices: deployments,
        }];
        let inputServiceUriQuestion = [{
            name: 'inputServiceUri',
            type: 'input',
            message: 'please input service uri:'
        }];

        inquirer.prompt(chooseDeploymentQuestion).then(function (answers) {
            let choosedDeployment = answers.chooseDeployment;
            if (choosedDeployment) {
                configTemplate.forEach(service => {
                    service.serviceUrl = service.serviceUrl.replace('{0}', choosedDeployment.website);
                });
                fs.writeFileSync(configFile, JSON.stringify(configTemplate, null, 2));
            } else {
                inquirer.prompt(inputServiceUriQuestion).then(function (answer) {
                    configTemplate.forEach(service => {
                        service.serviceUrl = service.serviceUrl.replace('{0}', answer.inputServiceUri);
                    });
                    fs.writeFileSync(configFile, JSON.stringify(configTemplate, null, 2));
                });
            }
        });
    },

    says: (message, service) => {
        return message + '(' + service['displayName'] + ')';
    },

    throwTestException: (request, response, error) => {
        let errorMessage = "";
        if (error.stack) {
            errorMessage = error.stack;
            if (error.stack.indexOf("at") > -1) {
                errorMessage = errorMessage.substring(0, errorMessage.indexOf("at")).trim();
            }
        }
        error.stack = JSON.stringify({
            errorMessage: errorMessage,
            request: request,
            response: response.response
        });
        throw error;
    },

    prepareHttpRequest: (option, response) => {
        option.transform = (body, httpResponse, resolveWithFullResponse) => {
            response.response = httpResponse;
            return body;
        }
    },

    getServiceApiDescription: (content) => {
        const match = /([^\(]+)\(([^\)]+)\)/.exec(content);
        if (!match || match.length < 2) {
            return {
                name: content,
                description: content
            };
        }
        return {
            name: match[2],
            description: match[1]
        };
    }
}
module.exports = TestUtils;