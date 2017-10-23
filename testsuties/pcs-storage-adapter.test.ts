import * as promiserequest from 'request-promise';
import { expect, should } from 'chai';
const TestUtils = require('./testUtils');
const services: any = TestUtils.loadConfig('pcs-storage-adapter');
const APIspecs: any = {
    'StorageAdapter DotNet': 'https://github.com/Azure/pcs-storage-adapter-dotnet/wiki/API-specs',
    'StorageAdapter Java': 'https://github.com/Azure/pcs-storage-adapter-java/wiki/API-specs'
};

describe('pcs-storage-adapter:StatusController', () => {
    describe('GET    /v1/status ', () => {
        services.forEach((service) => {
            it(service.displayName, () => {
                let response = null;
                const apiMessage = {
                    description: 'GET status of this service',
                    apiRouteTemplate: 'GET /v1/collections/{collectionId}/values/{key}'
                };
                const request: any = {
                    url: service.serviceUrl + '/v1/status',
                    method: 'GET',
                    transform: (body, httpResponse, resolveWithFullResponse) => {
                        response = httpResponse;
                        if (body) {
                            return JSON.parse(body);
                        }
                        return body;
                    }
                };

                return promiserequest(request).then((status) => {
                    expect('StorageAdapter').to.equal(status.Name);
                    expect('OK:Alive and well').to.equal(status.Status);
                }).catch((m) => {
                    TestUtils.throwTestException(apiMessage, request, response, m);
                });
            });
        });
    });
});
describe('pcs-storage-adapter:ValuesController', () => {

    beforeAll(() => {
        const promisesInit: object[] = [];
        for (let i = 1; i <= 5; i++) {
            promisesInit.push(promiserequest.put({
                body: {
                    CollectionId: 'testCollection',
                    Data: 'testData' + i.toString(),
                    Key: 'testKey' + i.toString()
                },
                headers: {
                    'contenttype': 'application/json'
                },
                json: true,
                url: services[0].serviceUrl + '/v1/collections/testCollection/values/testKey' + i.toString()
            }).catch((m) => {
                console.error(m);
            }));
        }

        services.forEach((element) => {
            const formatedDisplayName = element.displayName.replace(' ', '');
            promiserequest.put({
                body: {
                    CollectionId: 'testCollection' + formatedDisplayName,
                    Data: 'testData',
                    Key: formatedDisplayName + 'delete'
                },
                headers: {
                    'contenttype': 'application/json'
                },
                json: true,
                url: element.serviceUrl + '/v1/collections/testCollection' + formatedDisplayName + '/values/' + formatedDisplayName + 'delete'
            });
        });
        return Promise.all(promisesInit).then((m) => {
            console.log('test for pcsstorageadapter:ValuesController init successfully');
        }).catch((m) => {
            throw new Error(m);
        });
    });

    afterAll(() => {
        const promisesInit: object[] = [];
        for (let i = 1; i <= 5; i++) {
            promisesInit.push(promiserequest.delete(services[0].serviceUrl + '/v1/collections/testCollection/values/testKey' + i.toString()));
        }
        services.forEach((element) => {
            const formatedDisplayName = element.displayName.replace(' ', '');
            promisesInit.push(promiserequest.delete(element.serviceUrl + '/v1/collections/testCollection' +
                formatedDisplayName + '/values/testKey' + formatedDisplayName));
            promisesInit.push(promiserequest.delete(element.serviceUrl + '/v1/collections/testCollection' +
                formatedDisplayName + '/values/' + formatedDisplayName + 'delete'));
            promisesInit.push(promiserequest.delete(element.serviceUrl + '/v1/collections/testCollection' +
                formatedDisplayName + '/values/' + element.POST.Key));
        });
        return Promise.all(promisesInit).then((m) => {
            console.log('test for pcsstorageadapter:ValuesController delete successfully');
        }).catch((m) => {
            console.error(m);
        });
    });

    describe('GET    /v1/collections/:collectionId/values/:key', () => {
        services.forEach((element) => {
            it(element.displayName, () => {
                let response = null;
                const apiMessage = {
                    description: 'Get a value',
                    apiRouteTemplate: 'GET /v1/collections/{collectionId}/values/{key}'
                };
                const request: any = {
                    url: element.serviceUrl + '/v1/collections/testCollection/values/testKey1',
                    method: 'GET',
                    transform: (body, httpResponse, resolveWithFullResponse) => {
                        response = httpResponse;
                        if (body) {
                            return JSON.parse(body);
                        }
                        return body;
                    }
                };
                return promiserequest(request).
                    then((testKey) => {
                        expect(testKey.Key).to.equal('testKey1');
                        expect(testKey.Data).to.equal('testData1');
                    }).catch((m) => {
                        TestUtils.throwTestException(apiMessage, request, response, m);
                    });
            });
        });
    });

    describe('GET    /v1/collections/:collectionId/values', () => {
        services.forEach((element) => {
            it(element.displayName, () => {
                let response = null;
                const apiMessage = {
                    description: 'Get all the values in a collection',
                    apiRouteTemplate: 'GET /v1/collections/{collectionId}/values'
                };
                const request: any = {
                    url: element.serviceUrl + '/v1/collections/testCollection/values',
                    method: 'GET',
                    transform: (body, httpResponse, resolveWithFullResponse) => {
                        response = httpResponse;
                        if (body) {
                            return JSON.parse(body);
                        }
                        return body;
                    }
                };
                return promiserequest(request).
                    then((values) => {
                        element.values = values;
                        expect(values.Items.length).to.equal(5);
                        values.Items.forEach((item) => {
                            delete item.$metadata;
                            delete item.ETag;
                        });
                        expect(values.Items.sort()).to.deep.equal([
                            {
                                Data: 'testData1',
                                Key: 'testKey1'
                            },
                            {
                                Data: 'testData2',
                                Key: 'testKey2'
                            },
                            {
                                Data: 'testData3',
                                Key: 'testKey3'
                            },
                            {
                                Data: 'testData4',
                                Key: 'testKey4'
                            },
                            {
                                Data: 'testData5',
                                Key: 'testKey5'
                            }
                        ].sort());
                    }).catch((m) => {
                        TestUtils.throwTestException(apiMessage, request, response, m);
                    });
            });
        });
    });

    describe('PUT    /v1/collections/:collectionId/values/:key', () => {
        services.forEach((element) => {
            it(element.displayName, () => {
                const formatedDisplayName = element.displayName.replace(' ', '');
                let response = null;
                const apiMessage = {
                    description: 'Create key-value with PUT (Id generated by the client)',
                    apiRouteTemplate: 'PUT /v1/collections/{collectionId}/values/{key}'
                };
                const request: any = {
                    body: JSON.stringify({
                        Data: {
                            Name: formatedDisplayName
                        }
                    }),
                    headers: {
                        'content-type': 'application/json'
                    },
                    url: element.serviceUrl + '/v1/collections/testCollection' + formatedDisplayName +
                    '/values/testKey' + formatedDisplayName,
                    method: 'PUT',
                    transform: (body, httpResponse, resolveWithFullResponse) => {
                        response = httpResponse;
                        if (body) {
                            return JSON.parse(body);
                        }
                        return body;
                    }
                };
                return promiserequest(request).then((m) => {
                    expect(m.Key).equal('testKey' + formatedDisplayName);
                    expect(m.Data).to.deep.equal({
                        Data: {
                            Name: formatedDisplayName
                        }
                    });
                    expect(m).haveOwnProperty('ETag');
                    expect(m.$metadata.$modified).to.match(/^\d{4}\d{2}\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}/);
                }).catch((m) => {
                    TestUtils.throwTestException(apiMessage, request, response, m);
                });
            });
        });
    });

    describe('POST   /v1/collections/:collectionId/values', () => {
        services.forEach((element) => {
            it(element.displayName, () => {
                const formatedDisplayName = element.displayName.replace(' ', '');
                let response = null;
                const apiMessage = {
                    description: 'Create key-value with POST (Id generated by the service)',
                    apiRouteTemplate: 'POST /v1/collections/{collectionId}/values'
                };
                const request: any = {
                    body: JSON.stringify({
                        Data: {
                            Name: formatedDisplayName
                        }
                    }),
                    headers: {
                        'content-type': 'application/json'
                    },
                    url: element.serviceUrl + '/v1/collections/testCollection' +
                    formatedDisplayName + '/values',
                    method: 'POST',
                    transform: (body, httpResponse, resolveWithFullResponse) => {
                        response = httpResponse;
                        if (body) {
                            return JSON.parse(body);
                        }
                        return body;
                    }
                };
                return promiserequest(request).then((m) => {
                    element.POST = m;
                    expect(JSON.parse(m.Data)).to.deep.equal({
                        Name: formatedDisplayName
                    });
                    expect(m).haveOwnProperty('ETag');
                    expect(m).haveOwnProperty('Key');
                    expect(m.$metadata.$modified).to.match(/^\d{4}\d{2}\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}/);
                }).catch((m) => {
                    TestUtils.throwTestException(apiMessage, request, response, m);
                });
            });
        });
    });

    describe('DELETE /v1/collections/:collectionId/values/:key', () => {
        services.forEach((element) => {
            it(element.displayName, () => {
                const formatedDisplayName = element.displayName.replace(' ', '');
                let response = null;
                const apiMessage = {
                    description: 'Delete a key-value',
                    apiRouteTemplate: 'DELETE /v1/collections/{collectionId}/values/{key}'
                };
                const request: any = {
                    url: element.serviceUrl + '/v1/collections/testCollection' + formatedDisplayName + '/values/' +
                    formatedDisplayName + 'delete',
                    method: 'DELETE',
                    transform: (body, httpResponse, resolveWithFullResponse) => {
                        response = httpResponse;
                        if (body) {
                            return JSON.parse(body);
                        }
                        return body;
                    }
                };
                return promiserequest(request).catch((m) => {
                    TestUtils.throwTestException(apiMessage, request, response, m);
                });
            });
        });
    });
});
