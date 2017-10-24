import * as promiserequest from 'request-promise';
import { expect, should } from 'chai';
const TestUtils = require('./testUtils');
const services: any = TestUtils.loadConfig('pcs-storage-adapter');

describe('pcs-storage-adapter:StatusController', () => {
    describe('GET    /v1/status ', () => {
        services.forEach((service) => {
            it('get status of the service (' + service.displayName + ')', () => {
                const response: any = {};
                const options: any = {
                    url: service.serviceUrl + '/v1/status',
                    method: 'GET'
                };
                TestUtils.prepareHttpRequest(options, response);
                return promiserequest(options).then((status) => {
                    expect('StorageAdapter').to.equal(status.Name);
                    expect('OK:Alive and well').to.equal(status.Status);
                }).catch((m) => {
                    TestUtils.throwTestException(options, response.response, m);
                });
            });
        });
    });
});
