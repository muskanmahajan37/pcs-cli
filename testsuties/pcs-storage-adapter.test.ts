import * as promiserequest from 'request-promise';
import { expect, should } from 'chai';
import { TestUtils } from './testUtils'

const services: any = TestUtils.loadConfig('pcs-storage-adapter');
const APIspecs: any = {
    'StorageAdapter DotNet': 'https://github.com/Azure/pcs-storage-adapter-dotnet/wiki/API-specs',
    'StorageAdapter Java': 'https://github.com/Azure/pcs-storage-adapter-java/wiki/API-specs'
};

describe('pcs-storage-adapter:StatusController', () => {

    describe('GET    /v1/status ', () => {
        services.forEach((service) => {
            it(service.displayName, () => {
                service.testResultContext = {
                    service: JSON.parse(JSON.stringify(service)),
                    description: 'get status for pcs-storage-adapter service',
                    httpMethod: 'GET',
                    apiSpec: APIspecs[service.displayName],
                    request: {
                        requestUrl: service.serviceUrl + '/v1/status'
                    }
                };
                return promiserequest.get(service.testResultContext.request.requestUrl).then((m) => {
                    service.testResultContext.reponse = m;
                    const status = JSON.parse(m);
                    expect('StorageAdapter').to.equal(status.Name);
                    expect('OK:Alive and well').to.equal(status.Status);
                }).catch((m) => {
                    m.stack = JSON.stringify(TestUtils.prepareTestError(service.testResultContext, m.stack));
                    throw m;
                });
            });
        });
    });
});
