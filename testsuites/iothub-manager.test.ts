import * as rp from 'request-promise';
import { expect, should } from 'chai';
import * as uuid from 'uuid';

should();

const TestUtils = require('./testUtils');
const says = TestUtils.says;
const services: any = TestUtils.loadConfig('iothub-manager');

const dateTimeMatcher = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}/;
const testDeviceIdPrefix = 'ApiTestDevice_';
const jobIdPrefix = 'ApiTestJob-';

// increase default timeout interval (5s) for each test.
jasmine.DEFAULT_TIMEOUT_INTERVAL=10000;

describe('Status API', () => {
    describe('GET    /v1/status ', () => {
        services.forEach(service => {
            it(says('should return service status report', service), () => {
                const options: any = {
                    url: service.serviceUrl + '/v1/status',
                    method: 'GET',
                    json: true
                };
                const response: any = {};
                TestUtils.prepareHttpRequest(options, response);
                return rp(options).then((status) => {
                    // TODO: Java version does not include this property
                    expect(status.Name).to.equal('IoTHubManager');
                    expect(status.Status).to.equal('OK:Alive and well');
                    status.should.have.property('CurrentTime').to.match(dateTimeMatcher);
                    status.should.have.property('StartTime').to.match(dateTimeMatcher);
                    status.should.have.property('UpTime').to.be.above(0);
                    status.should.have.property('Properties').to.be.an.instanceof(Object);
                    status.should.have.property('Dependencies').to.be.an.instanceof(Object);
                    // TODO: Java version does not include this property
                    status.should.have.property('UID').to.match(/WebService..*/);
                    status.should.have.deep.property('$metadata', { '$uri': '/v1/status', '$type': 'Status;1' });
                }).catch(m => {
                    TestUtils.throwTestException(options, response, m);
                });
            });
        });
    });
});

describe('Device API', () => {
    describe('GET /v1/devices ', () => {
        services.forEach((service) => {
            it(says('should return all devices', service), () => {
                const options: any = {
                    url: service.serviceUrl + '/v1/devices',
                    method: 'GET',
                    json: true
                };
                const response: any = {};
                TestUtils.prepareHttpRequest(options, response);
                return rp(options).then(devices => {
                    devices.should.have.deep.property('$metadata', { '$uri': '/v1/devices', '$type': 'DeviceList;1' });
                    devices.should.have.property('continuationToken');
                    devices.should.have.property('items').to.be.an.instanceof(Array);
                }).catch(m => {
                    TestUtils.throwTestException(options, response, m);
                });
            });
        });
    });

    describe('POST /v1/devices/query ', () => {
        services.forEach((service) => {
            it(says('should return device list when post query with parameters', service), () => {
                let options = {
                    method: 'POST',
                    uri: service.serviceUrl + '/v1/devices/query',
                    body: [
                        { Key: 'Id', Operator: 'NE', Value: '' }
                    ],
                    json: true
                };
                const response: any = {};
                TestUtils.prepareHttpRequest(options, response);
                return rp(options).then((devices) => {
                    devices.should.have.deep.property('$metadata', { '$uri': '/v1/devices', '$type': 'DeviceList;1' });
                    devices.should.have.property('continuationToken');
                    devices.should.have.property('items').to.be.an.instanceof(Array);
                }).catch(m => {
                    TestUtils.throwTestException(options, response, m);
                });
            });
        });
    });

    describe('GET /v1/devices?query=<query> ', () => {
        services.forEach((service) => {
            it(says('should return device list when querying by parameters in url', service), () => {
                let query = 'deviceId!=\'\'';
                const options: any = {
                    url: service.serviceUrl + '/v1/devices?query=' + query,
                    method: 'GET',
                    json: true
                };
                const response: any = {};
                TestUtils.prepareHttpRequest(options, response);
                return rp(options).then((devices) => {
                    devices.should.have.deep.property('$metadata', { '$uri': '/v1/devices', '$type': 'DeviceList;1' });
                    devices.should.have.property('continuationToken');
                    devices.should.have.property('items').to.be.an.instanceof(Array);
                }).catch(m => {
                    TestUtils.throwTestException(options, response, m);
                });
            });
        });
    });

    describe('GET /v1/devices/{id} ', () => {
        services.forEach((service) => {
            let deviceId = testDeviceIdPrefix + uuid.v4();
            let deviceUri = service.serviceUrl + '/v1/devices/' + deviceId;

            beforeEach((done) => {
                let options = {
                    method: 'POST',
                    uri: service.serviceUrl + '/v1/devices',
                    body: {
                        Id: deviceId,
                        Tags: {
                            Building: 'Building 40',
                            deviceType: 'Simulated',
                            Floor: '1F'
                        }
                    },
                    json: true
                };
                return rp.post(options).then((device) => {
                    // console.log(deviceId + ' created');
                    // add some delay before running each test
                    setTimeout(function () {
                        done();
                    }, 500);
                });
            });

            afterEach(() => {
                return rp.delete(deviceUri).then(() => {
                    // console.log(deviceId + ' deleted');
                })
            });

            it(says('should return specific device by id successfully', service), () => {
                const options: any = {
                    url: deviceUri,
                    method: 'GET',
                    json: true
                };
                const response: any = {};
                TestUtils.prepareHttpRequest(options, response);
                return rp(options).then((device) => {
                    device.should.have.property('Id', deviceId);
                    device.should.have.deep.property('Tags', {
                        Building: 'Building 40',
                        deviceType: 'Simulated',
                        Floor: '1F'
                    });
                }).catch(m => {
                    TestUtils.throwTestException(options, response.response, m);
                });
            });
        });
    });

    describe('POST /v1/devices ', () => {
        services.forEach((service) => {
            let deviceId = testDeviceIdPrefix + uuid.v4();
            let deviceUri = service.serviceUrl + '/v1/devices/' + deviceId;

            afterEach(() => {
                return rp.delete(deviceUri).then(() => {
                    // console.log(deviceId + ' deleted');
                })
            });

            it(says('should create a new device successfully', service), () => {
                let options = {
                    method: 'POST',
                    uri: service.serviceUrl + '/v1/devices',
                    body: {
                        Id: deviceId,
                        Tags: {
                            Building: 'Building 40',
                            deviceType: 'Simulated',
                            Floor: '1F'
                        },
                        Properties: {
                            Desired: {
                                Number: 4,
                                Config: { TemperatureMeanValue: 70.0 },
                                Compus: 'Redmond',
                                IsNew: true
                            },
                            Reported: {
                                Config: {
                                    TelemetryInterval: 15.0,
                                    TemperatureMeanValue: 70.0
                                },
                                System: {
                                    Manufacturer: 'Contoso Inc.',
                                    ModelNumber: 'MD-2',
                                    SerialNumber: 'SER2',
                                    FirmwareVersion: 1.2,
                                    Platform: 'Plat-2',
                                    Processor: 'i3-2',
                                    InstalledRAM: '2 MB'
                                }
                            }
                        },
                        IsSimulated: false
                    },
                    json: true
                };
                const response: any = {};
                TestUtils.prepareHttpRequest(options, response);
                return rp(options).then((device) => {
                    device.should.have.deep.property('$metadata', {
                        '$uri': '/v1/devices/' + deviceId,
                        '$type': 'Device;1',
                        '$twin_uri': '/v1/devices/' + deviceId + '/twin'
                    });
                    // TODO: Java version will return ETag but DotNet version return Etag.
                    // device.should.have.property('ETag');
                    device.should.have.any.keys('Etag', 'ETag')
                    device.should.have.property('Id').to.be.equal(deviceId);
                    device.should.have.property('C2DMessageCount').to.be.above(-1);
                    device.should.have.property("Connected").to.be.a('boolean');
                    device.should.have.property("Enabled").to.be.a('boolean');
                    device.should.have.deep.property('Tags', {
                        Building: 'Building 40',
                        deviceType: 'Simulated',
                        Floor: '1F'
                    });
                    // TODO: Java version can return complete Reported properties. but DotNet will return empty object.
                    // it should not be updated since Reported property is updated by device.
                    device.should.have.deep.property('Properties').to.have.property('Reported');
                    device.should.have.deep.property('Properties').to.have.deep.property('Desired', {
                        Number: 4,
                        Config: { TemperatureMeanValue: 70.0 },
                        Compus: 'Redmond',
                        IsNew: true
                    });
                }).catch(m => {
                    TestUtils.throwTestException(options, response, m);
                });
            });
        });
    });

    describe('PUT /v1/devices/{id} ', () => {
        services.forEach((service) => {
            let deviceId = testDeviceIdPrefix + uuid.v4();
            let deviceUri = service.serviceUrl + '/v1/devices/' + deviceId;

            afterEach(() => {
                return rp.delete(deviceUri).then(() => {
                    // console.log(deviceId + ' deleted');
                })
            });

            it(says('should create or update device successfully', service), () => {
                let options = {
                    method: 'PUT',
                    uri: deviceUri,
                    body: {
                        Id: deviceId,
                        Tags: {
                            Building: 'Building 40',
                            deviceType: 'Simulated',
                            Floor: '1F'
                        }
                    },
                    json: true
                };
                const response: any = {};
                TestUtils.prepareHttpRequest(options, response);
                return rp(options).then((device) => {
                    device.should.have.deep.property('$metadata', {
                        '$uri': '/v1/devices/' + deviceId,
                        '$type': 'Device;1',
                        '$twin_uri': '/v1/devices/' + deviceId + '/twin'
                    });
                    // TODO: Java version will return ETag but DotNet version return Etag.
                    // device.should.have.property('ETag');
                    device.should.have.any.keys('Etag', 'ETag')
                    device.should.have.property('Id').to.be.equal(deviceId);
                    device.should.have.property('C2DMessageCount').to.be.above(-1);
                    device.should.have.property("Connected").to.be.a('boolean');
                    device.should.have.property("Enabled").to.be.a('boolean');
                    device.should.have.deep.property('Tags', {
                        Building: 'Building 40',
                        deviceType: 'Simulated',
                        Floor: '1F'
                    });
                }).catch(m => {
                    TestUtils.throwTestException(options, response, m);
                });
            });
        });
    });
});

describe('Job API', () => {
    describe('GET /v1/jobs ', () => {
        services.forEach(service => {
            it(says('should return job list when querying without any parameter', service), () => {
                const options: any = {
                    url: service.serviceUrl + '/v1/jobs',
                    method: 'GET',
                    json: true
                };
                const response: any = {};
                TestUtils.prepareHttpRequest(options, response);
                return rp(options).then((jobs) => {
                    jobs.should.be.an.instanceof(Array);
                }).catch(m => {
                    TestUtils.throwTestException(options, response, m);
                });
            });
        });
    });

    describe('GET /v1/jobs?jobType={0}&jobStatus={1}&pageSize={3} ', () => {
        services.forEach((service) => {
            it(says('should return job list when querying by jobType and jobStatus', service), () => {
                const queryString = '?jobType=4&jobStatus=3&pageSize=10';
                const options: any = {
                    url: service.serviceUrl + '/v1/jobs' + queryString,
                    method: 'GET',
                    json: true
                };
                const response: any = {};
                TestUtils.prepareHttpRequest(options, response);
                return rp(options).then(jobs => {
                    jobs.should.be.an.instanceof(Array);
                }).catch(m => {
                    TestUtils.throwTestException(options, response, m);
                });
            });
        });
    });

    describe('POST /v1/jobs ', () => {
        services.forEach(service => {
            let batchId = uuid.v4();
            let testDevices = [];

            beforeAll(() => {
                return createTestDevices(service.serviceUrl, batchId, 1).then(devices => {
                    testDevices = devices;
                })
            });

            afterAll(() => {
                return clearTestDevices(service.serviceUrl, testDevices).then(() => {
                    // console.log('test devices cleared');
                });
            });

            it(says('should create a twin job', service), () => {
                let jobId = jobIdPrefix + uuid.v4();
                let options = {
                    method: 'POST',
                    uri: service.serviceUrl + '/v1/jobs',
                    body: {
                        jobId: jobId,
                        queryCondition: 'tags.BatchId=\'' + batchId + '\'',
                        updateTwin: {
                            tags: {
                                Touched: true
                            }
                        }
                    },
                    json: true
                };
                const response: any = {};
                TestUtils.prepareHttpRequest(options, response);
                return rp(options).then(job => {
                    job.should.have.property('jobId', jobId);
                    job.should.have.property('type', 4);
                    expect(job.status).to.be.within(0, 7);
                    // TODO: java sdk won't return maxExecutionTimeInSeconds property
                    // job.should.have.property('maxExecutionTimeInSeconds');
                    // the job is just triggered and some properties is absent for some while
                    // and will be readable later.
                    return rp.get(service.serviceUrl + '/v1/jobs/' + jobId).then(response => {
                        let job = JSON.parse(response);
                        job.should.have.property('jobId', jobId);
                        job.should.have.deep.property('updateTwin').to.have.property('tags', { Touched: true });
                        // TODO: DotNet version won't return resultStatistics but Java version return it.
                        // job.should.have.deep.property('resultStatistics', {
                        //     deviceCount: 0,
                        //     failedCount: 0,
                        //     succeededCount: 0,
                        //     runningCount: 0,
                        //     pendingCount: 0
                        // });
                    });
                }).catch(m => {
                    console.log('Warning: ThrottlingMaxActiveJobCountExceeded! Test Skipped');
                    let message = JSON.stringify(m);
                    if (message.match(/.*ErrorCode.*ThrottlingMaxActiveJobCountExceeded.*/)) {
                        return;
                    }
                    else {
                        TestUtils.throwTestException(options, response, m);
                    }
                });
            });

           it(says('should create a method job', service), () => {
                let jobId = jobIdPrefix + uuid.v4();
                let options = {
                    method: 'POST',
                    uri: service.serviceUrl + '/v1/jobs',
                    body: {
                        jobId: jobId,
                        queryCondition: 'tags.BatchId=\'' + batchId + '\'',
                        methodParameter: {
                           name: "Reboot",
                        //    responseTimeout: 5,
                        //    connectionTimeout: 5,
                        //    jsonPayload: '{\"foo6\": \"bar6\"}'
                        }
                    },
                    json: true
                };
                const response: any = {};
                TestUtils.prepareHttpRequest(options, response);
                return rp(options).then(job => {
                    job.should.have.property('jobId', jobId);
                    job.should.have.property('type', 3);
                    expect(job.status).to.be.within(0, 7);
                    job.should.have.deep.property('resultStatistics', {
                        deviceCount: 0,
                        failedCount: 0,
                        succeededCount: 0,
                        runningCount: 0,
                        pendingCount: 0
                    });
                    job.should.have.property('maxExecutionTimeInSeconds');
                    // the job is just triggered and some properties is absent for some while
                    // and will be readable later.
                    return rp.get(service.serviceUrl + '/v1/jobs/' + jobId).then(job => {
                        job.should.have.property('jobId', jobId);
                        job.should.have.deep.property('methodParameter').to.have.property('name', 'Reboot');
                    })
                }).catch(m => {
                    console.log('Warning: ThrottlingMaxActiveJobCountExceeded! Test Skipped');
                    let message = JSON.stringify(m);
                    if (message.match(/.*ErrorCode.*ThrottlingMaxActiveJobCountExceeded.*/)) {
                        return;
                    }
                    else {
                        TestUtils.throwTestException(options, response, m);
                    }
                });
            });
        });
    });
});

function createTestDevices(serviceUrl: string, batchId: string, count: number): Promise<any[]> {
    let promises = [];
    for (let i = 0; i < count; i++) {
        let deviceId = testDeviceIdPrefix + uuid.v4();
        let options = {
            method: 'POST',
            uri: serviceUrl + '/v1/devices',
            body: {
                Id: deviceId,
                Tags: {
                    BatchId: batchId,
                    Purpose: 'testing',
                    Touched: false,
                }
            },
            json: true
        };
        promises.push(rp(options));
    }
    return Promise.all(promises);
}

function clearTestDevices(serviceUrl: string, devices: object[]): Promise<void[]> {
    let promises = [];
    devices.forEach((device) => {
        let deviceUri = serviceUrl +  '/v1/devices/' + device['Id'];
        promises.push(rp.delete(deviceUri));
    })
    return Promise.all(promises);
}
