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

    says: (message , service) => {
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