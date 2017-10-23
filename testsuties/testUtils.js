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

    throwTestException: (apiMessage, request, response, error) => {
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
            response: response,
            apiMessage: apiMessage,
        });
        throw error;
    }
}
module.exports = TestUtils;