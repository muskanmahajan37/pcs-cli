import * as rp from 'request-promise';
import { expect, should } from 'chai';

should();

const TestUtils = require('./testUtils');
const says = TestUtils.says;
const services: any = TestUtils.loadConfig('pcs-config');

const dateTimeMatcher = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}/;

// increase default timeout interval (5s) for each test.
jasmine.DEFAULT_TIMEOUT_INTERVAL=10000;

describe('Status API', () => {
    describe('GET    /v1/status ', () => {
        services.forEach(service => {
            it(says('should return service status ', service), () => {
                const options: any = {
                    url: service.serviceUrl + '/v1/status',
                    method: 'GET',
                    json: true
                };
                const response: any = {};
                TestUtils.prepareHttpRequest(options, response);
                return rp(options).then((status) => {
                    expect(status.Name).to.equal('Config');
                    expect(status.Status).to.equal('OK:Alive and well');
                    status.should.have.property('CurrentTime').to.match(dateTimeMatcher);
                    status.should.have.property('StartTime').to.match(dateTimeMatcher);
                    status.should.have.property('UpTime').to.be.above(0);
                    status.should.have.property('Properties').to.be.an.instanceof(Object);
                    status.should.have.property('Dependencies').to.be.an.instanceof(Object);
                    status.should.have.property('UID').to.match(/WebService..*/);
                    status.should.have.deep.property('$metadata', { '$uri': '/v1/status', '$type': 'Status;1' });
                }).catch(m => {
                    TestUtils.throwTestException(options, response, m);
                });
            });
        });
    });
});

describe('solution-settings API', () => {

    describe('GET /v1/solution-settings/theme', () => {
        services.forEach(service => {
            it(says('should return the default whole solution settings ', service), () => {
                const options: any = {
                    url: service.serviceUrl + '/v1/solution-settings/theme',
                    method: 'GET',
                    json: true
                };
                const response: any = {};
                TestUtils.prepareHttpRequest(options, response);
                return rp(options).then((theme) => {
                    // TODO: API spec is using 'name' and 'description' but code is 'Name', 'Description'
                    theme.should.have.deep.property('Name');
                    theme.should.have.deep.property('Description');
                }).catch(m => {
                    TestUtils.throwTestException(options, response, m);
                });
            });
        });
    });

    describe('PUT /v1/solution-settings/theme', () => {
        services.forEach(service => {
            it(says('Set whole solution settings ', service), () => {
                // because we do not have delete api, skip this test
            });
        });
    });

    describe('GET /v1/solution-settings/logo', () => {
        services.forEach(service => {
            it(says('should return  the default solution logo ', service), () => {
                const options: any = {
                    url: service.serviceUrl + '/v1/solution-settings/logo',
                    method: 'GET'
                };
                const response: any = {};
                TestUtils.prepareHttpRequest(options, response);
                return rp(options).then((solutionSettings)=> {
                    expect(response.response).have.deep.property('headers').to.have.property('content-type', 'image/svg+xml');
                    expect(solutionSettings).to.match(/.*<svg.*<\/svg>/i);
                }).catch(m => {
                    TestUtils.throwTestException(options, response, m);
                });
            });
        });
    });

    describe('PUT /v1/solution-settings/logo', () => {
        services.forEach(service => {
            xit(says('Set whole solution settings ', service), () => {
                // because we do not have delete api, skip this test to avoid keeping garbage settings.
            });
        });
    });

});

describe('user-settings API', () => {

    describe('GET /v1/user-settings/{id}', () => {
        services.forEach(service => {
            it(says('should return individual user settings ', service), () => {
                // because we do not have default user-settings and  delete api, skip this test
            });
        });
    });

    describe('PUT /v1/user-settings/{id}', () => {
        services.forEach(service => {
            it(says('Set individual user settings', service), () => {
                // because we do not have delete api, skip this test
            });
        });
    });
});

describe('devicegroups API', () => {

    beforeAll(() => {
        const promisePool: Array<any> = [];
        services.devicegroupPool = [];

        for (let i = 0; i < 5; i++) {
            promisePool.push(rp.post(services[0].serviceUrl + '/v1/devicegroups/', {
                body: {
                    'Conditions': [
                        {
                            'Key': 'key1' + i,
                            'Operator': 'EQ',
                            'Value': 'value1' + i
                        },
                        {
                            'Key': 'key2' + i,
                            'Operator': 'EQ',
                            'Value': 'value2' + i
                        }
                    ],
                    'DisplayName': 'DisplayName',
                },
                json: true
            }).then((m) => {
                services.devicegroupPool.push(m.Id);
            }));
        }

        services.forEach((service) => {
            promisePool.push(rp.post(service.serviceUrl + '/v1/devicegroups/', {
                body: {
                    'Conditions': [
                        {
                            'Key': 'key' + service.displayName + 'get',
                            'Operator': 'EQ',
                            'Value': 'value1'
                        },
                        {
                            'Key': 'key2' + service.displayName + 'get',
                            'Operator': 'EQ',
                            'Value': 'value2'
                        }
                    ],
                    'DisplayName': service.displayName,
                },
                json: true
            }).then((m) => {
                service.devicegroupGet = m.Id;
            }));

            promisePool.push(rp.post(service.serviceUrl + '/v1/devicegroups/', {
                body: {
                    'Conditions': [
                        {
                            'Key': 'key' + service.displayName + 'update',
                            'Operator': 'EQ',
                            'Value': 'value1'
                        },
                        {
                            'Key': 'key2',
                            'Operator': 'EQ',
                            'Value': 'value2'
                        }
                    ],
                    'DisplayName': service.displayName,
                },
                json: true
            }).then((m) => {
                service.devicegroupUpdate = {
                    Id: m.Id,
                    ETag: m.ETag
                };
            }));

            promisePool.push(rp.post(service.serviceUrl + '/v1/devicegroups/', {
                body: {
                    'Conditions': [
                        {
                            'Key': 'key' + service.displayName + 'delete',
                            'Operator': 'EQ',
                            'Value': 'value1'
                        },
                        {
                            'Key': 'key2',
                            'Operator': 'EQ',
                            'Value': 'value2'
                        }
                    ],
                    'DisplayName': service.displayName,
                },
                json: true
            }).then((m) => {
                service.devicegroupDelete = m.Id;
            }));
        });
        return Promise.all(promisePool).then((m) => {
            console.log('devicegroups API init successfully');
        }).catch((m) => {
            console.log('devicegroups API init failed:', m);
        });
    });

    afterAll(() => {
        const promisePool: Array<any> = [];
        services.devicegroupPool.forEach((m) => {
            promisePool.push(rp.delete(services[0].serviceUrl + '/v1/devicegroups/' + m));
        });
        services.forEach((service) => {
            promisePool.push(rp.delete(service.serviceUrl + '/v1/devicegroups/' + service.devicegroupGet));
            promisePool.push(rp.delete(service.serviceUrl + '/v1/devicegroups/' + service.devicegroupUpdate.Id));
            promisePool.push(rp.delete(service.serviceUrl + '/v1/devicegroups/' + service.devicegroupDelete));

        });
        return Promise.all(promisePool).then((m) => {
            console.log('devicegroups API clear successfully');
        }).catch((m) => {
            console.log('devicegroups API clear failed:', m);
        });
    });

    describe('GET /v1/devicegroups', () => {
        services.forEach(service => {
            it(says('should return all device group definitions ', service), () => {
                const options: any = {
                    url: service.serviceUrl + '/v1/devicegroups',
                    method: 'GET',
                    json: true
                };
                const response: any = {};
                TestUtils.prepareHttpRequest(options, response);
                return rp(options).then((devicegroups) => {
                    devicegroups.should.have.property('items').to.be.an.instanceof(Array);
                    devicegroups.should.have.deep.property('$metadata', {
                        '$type': 'DeviceGroupList;1',
                        '$url': '/v1/devicegroups'
                    });
                }).catch(m => {
                    TestUtils.throwTestException(options, response, m);
                });
            });
        });
    });

    describe('GET /v1/devicegroups/{id}', () => {
        services.forEach(service => {
            it(says('Get single device group definition ', service), () => {
                const options: any = {
                    url: service.serviceUrl + '/v1/devicegroups/' + service.devicegroupGet,
                    method: 'GET',
                    json: true
                };
                const response: any = {};
                TestUtils.prepareHttpRequest(options, response);
                return rp(options).then((devicegroup) => {
                    //TODO: API spec is using lowercase names but code is using uppercase names.
                    expect(devicegroup).have.property('Id', service.devicegroupGet);
                    expect(devicegroup).have.property('DisplayName', service.displayName);
                    expect(devicegroup).have.property('Conditions').instanceOf(Array);
                    expect(devicegroup).have.property('ETag');
                    expect(devicegroup).have.deep.property('$metadata', {
                        '$type': 'DeviceGroup;1',
                        '$url': '/v1/devicegroups/' + service.devicegroupGet
                    });
                }).catch(m => {
                    TestUtils.throwTestException(options, response, m);
                });
            });
        });
    });

    describe('POST /v1/devicegroups', () => {
        services.forEach(service => {
            it(says('Add single device group definition ', service), () => {
                const options: any = {
                    body: {
                        'Conditions': [
                            {
                                'Key': 'key1',
                                'Operator': 'EQ',
                                'Value': 'value1'
                            },
                            {
                                'Key': 'key2',
                                'Operator': 'EQ',
                                'Value': 'value2'
                            }
                        ],
                        'DisplayName': service.displayName + 'add',
                    },
                    json: true,
                    method: 'POST',
                    url: service.serviceUrl + '/v1/devicegroups/'
                };
                const response: any = {};
                TestUtils.prepareHttpRequest(options, response);
                return rp(options).then((devicegroup) => {
                    devicegroup.should.have.deep.property('Conditions', [
                        {
                            'Key': 'key1',
                            'Operator': 'EQ',
                            'Value': 'value1'
                        },
                        {
                            'Key': 'key2',
                            'Operator': 'EQ',
                            'Value': 'value2'
                        }
                    ]);
                    devicegroup.should.have.property('DisplayName', service.displayName + 'add');
                }).catch(m => {
                    TestUtils.throwTestException(options, response, m);
                });
            });
        });
    });

    describe('PUT /v1/devicegroups/{id}', () => {
        services.forEach(service => {
            it(says('Update single device group definition ', service), () => {
                const options: any = {
                    body: {
                        'Conditions': [
                            {
                                'Key': 'key1',
                                'Operator': 'LE',
                                'Value': 'value1'
                            },
                            {
                                'Key': 'key2',
                                'Operator': 'LE',
                                'Value': 'value2'
                            }
                        ],
                        'DisplayName': service.displayName + 'update',
                        'ETag': service.devicegroupUpdate.ETag
                    },
                    json: true,
                    method: 'PUT',
                    url: service.serviceUrl + '/v1/devicegroups/' + service.devicegroupUpdate.Id
                };
                const response: any = {};
                TestUtils.prepareHttpRequest(options, response);
                return rp(options).then((devicegroup) => {
                    expect(devicegroup).have.property('Id', service.devicegroupUpdate.Id);
                    expect(devicegroup).have.property('DisplayName', service.displayName + 'update');
                    expect(devicegroup).have.deep.property('Conditions', [
                        {
                            'Key': 'key1',
                            'Operator': 'LE',
                            'Value': 'value1'
                        },
                        {
                            'Key': 'key2',
                            'Operator': 'LE',
                            'Value': 'value2'
                        }
                    ]);
                    expect(devicegroup).have.property('ETag');
                }).catch(m => {
                    TestUtils.throwTestException(options, response, m);
                });
            });
        });
    });

    describe('DELETE /v1/devicegroups/{id}', () => {
        services.forEach(service => {
            it(says('Delete device group ', service), () => {
                const options: any = {
                    url: service.serviceUrl + '/v1/devicegroups/' + service.devicegroupDelete,
                    method: 'DELETE'
                };
                const response: any = {};
                TestUtils.prepareHttpRequest(options, response);
                return rp(options).then((body) => {
                    expect(response.response).have.property('statusCode', 200);
                }).catch(m => {
                    TestUtils.throwTestException(options, response, m);
                });
            });
        });
    });

});