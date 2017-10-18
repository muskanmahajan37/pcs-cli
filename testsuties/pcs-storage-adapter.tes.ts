import * as promiserequest from 'request-promise';
import { expect, should } from 'chai';

const config: any = require('./testsuites-config.json').storageAdapter;

describe('test for pcs-storage-adapter:StatusController', () => {

    describe('GET    /v1/status ', () => {
        config.forEach((element) => {
            it(element.environment, () => {
                return promiserequest.get(element.service + '/status').then((m) => {
                    const status = JSON.parse(m);
                    expect('StorageAdapter').to.equal(status.Name);
                    expect('OK:Alive and well').to.equal(status.Status);
                    element.status = status;
                });
            });
        });
    });

});

describe('test for pcs-storage-adapter:ValuesController', () => {

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
                    'content-type': 'application/json'
                },
                json: true,
                url: config[0].service + '/collections/testCollection/values/testKey' + i.toString()
            }).catch((m) => {
                console.error(m);
            }));
        }

        config.forEach((element) => {
            promiserequest.put({
                body: {
                    CollectionId: 'testCollection' + element.environment,
                    Data: 'testData',
                    Key: element.environment + 'delete'
                },
                headers: {
                    'content-type': 'application/json'
                },
                json: true,
                url: element.service + '/collections/testCollection' + element.environment + '/values/' + element.environment + 'delete'
            });
        });
        return Promise.all(promisesInit).then((m) => {
            console.log('test for pcs-storage-adapter:ValuesController init successfully');
        }).catch((m) => {
            throw new Error(m);
        });
    });

    afterAll(() => {
        const promisesInit: object[] = [];
        for (let i = 1; i <= 5; i++) {
            promisesInit.push(promiserequest.delete(config[0].service + '/collections/testCollection/values/testKey' + i.toString()));
        }
        config.forEach((element) => {
            promisesInit.push(promiserequest.delete(element.service + '/collections/testCollection' +
                element.environment + '/values/testKey' + element.environment));
            promisesInit.push(promiserequest.delete(element.service + '/collections/testCollection' +
                element.environment + '/values/' + element.environment + 'delete'));
            promisesInit.push(promiserequest.delete(element.service + '/collections/testCollection' +
                element.environment + '/values/' + element.POST.Key));
        });
        return Promise.all(promisesInit).then((m) => {
            console.log('test for pcs-storage-adapter:ValuesController delete successfully');
        }).catch((m) => {
            console.error(m);
        });
    });

    describe('GET    /v1/collections/:collectionId/values/:key', () => {
        config.forEach((element) => {
            it(element.environment, () => {
                return promiserequest.get(element.service + '/collections/testCollection/values/testKey1').
                    then((m) => {
                        const testKey = JSON.parse(m);
                        element.testKey = testKey;
                        expect(testKey.Key).to.equal('testKey1');
                        expect(testKey.Data).to.equal('testData1');
                    });
            });
        });
    });

    describe('GET    /v1/collections/:collectionId/values', () => {
        config.forEach((element) => {
            it(element.environment, () => {
                return promiserequest.get(element.service + '/collections/testCollection/values').
                    then((m) => {
                        const values = JSON.parse(m);
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
                    });
            });
        });
    });

    describe('PUT    /v1/collections/:collectionId/values/:key', () => {
        config.forEach((element) => {
            it(element.environment, () => {
                return promiserequest.put({
                    body: {
                        CollectionId: 'testCollection' + element.environment,
                        Data: 'testData' + element.environment,
                        Key: 'testKey' + element.environment
                    },
                    headers: {
                        'content-type': 'application/json'
                    },
                    json: true,
                    url: element.service + '/collections/testCollection' + element.environment +
                    '/values/testKey' + element.environment
                }).then((m) => {
                    expect(m.Key).equal('testKey' + element.environment);
                    expect(m.Data).equal('testData' + element.environment);
                    expect(m).haveOwnProperty('ETag');
                    expect(m.$metadata.$modified).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}/);
                });
            });
        });
    });

    describe('POST   /v1/collections/:collectionId/values', () => {
        config.forEach((element) => {
            it(element.environment, () => {
                return promiserequest.post({
                    body: {
                        Data: JSON.stringify({
                            Name: element.environment
                        })
                    },
                    headers: {
                        'content-type': 'application/json'
                    },
                    json: true,
                    url: element.service + '/collections/testCollection' +
                    element.environment + '/values'
                }).then((m) => {
                    element.POST = m;
                    expect(JSON.parse(m.Data)).to.deep.equal({
                        Name: element.environment
                    });
                    expect(m).haveOwnProperty('ETag');
                    expect(m).haveOwnProperty('Key');
                    expect(m.$metadata.$modified).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}/);
                });
            });
        });
    });

    describe('DELETE /v1/collections/:collectionId/values/:key', () => {
        config.forEach((element) => {
            it(element.environment, () => {
                return promiserequest.delete(element.service +
                    '/collections/testCollection' + element.environment + '/values/' +
                    element.environment + 'delete').
                    then((m) => {
                        const result: any = m;
                    });
            });
        });
    });

});
