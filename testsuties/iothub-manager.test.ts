import * as rp from 'request-promise';
import { expect } from 'chai';
import * as uuid from 'uuid';
import { TestUtils } from './testUtils'

const should = require('chai').should();

const services: any = TestUtils.loadConfig('iothub-manager');
const dateTimeMatcher = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}/;
const testDeviceIdPrefix = 'ApiTestDevice_';

describe('Status API', () => {
    describe('GET    /v1/status ', () => {
        services.forEach((service) => {
            it(service.displayName, () => {
                return rp.get(service.serviceUrl + '/v1/status').then((response) => {
                    const status = JSON.parse(response);
                    expect(status.Name).to.equal('IoTHubManager');
                    expect(status.Status).to.equal('OK:Alive and well');
                    status.should.have.property('CurrentTime').to.match(dateTimeMatcher);
                    status.should.have.property('StartTime').to.match(dateTimeMatcher);
                    status.should.have.property('UpTime').to.be.above(0);
                    status.should.have.property('Properties').to.be.an.instanceof(Object);
                    status.should.have.property('Dependencies').to.be.an.instanceof(Object);
                    status.should.have.property('UID').to.match(/WebService..*/);
                    status.should.have.deep.property('$metadata', { '$uri': '/v1/status', '$type': 'Status;1' });
                });
            });
        });
    });
});

describe('Device API', () => {
    describe('GET /v1/devices ', () => {
        services.forEach((service) => {
            it(service.displayName, () => {
                return rp.get(service.serviceUrl + '/v1/devices').then((response) => {
                    const devices = JSON.parse(response);
                    devices.should.have.deep.property('$metadata', { '$uri': '/v1/devices', '$type': 'DeviceList;1' });
                    devices.should.have.property('continuationToken');
                    devices.should.have.property('items').to.be.an.instanceof(Array);
                });
            });
        });
    });

    describe('POST /v1/devices/query ', () => {
        services.forEach((service) => {
            it(service.displayName, () => {
                let options = {
                    method: 'POST',
                    uri: service.serviceUrl + '/v1/devices/query',
                    body: [
                        { Key: 'Id', Operator: 'NE', Value: '' }
                    ],
                    json: true
                };
                return rp(options).then((devices) => {
                    devices.should.have.deep.property('$metadata', { '$uri': '/v1/devices', '$type': 'DeviceList;1' });
                    devices.should.have.property('continuationToken');
                    devices.should.have.property('items').to.be.an.instanceof(Array);
                });
            });
        });
    });

    describe('GET /v1/devices?query=<query> ', () => {
        services.forEach((service) => {
            it(service.displayName, () => {
                let query = 'deviceId!=\'\'';
                let uri = service.serviceUrl + '/v1/devices?query=' + query;
                console.log(uri);
                return rp.get(uri).then((response) => {
                    const devices = JSON.parse(response);
                    devices.should.have.deep.property('$metadata', { '$uri': '/v1/devices', '$type': 'DeviceList;1' });
                    devices.should.have.property('continuationToken');
                    devices.should.have.property('items').to.be.an.instanceof(Array);
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
                    body:  {
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
                    console.log('DEFAULT_TIMEOUT_INTERVAL: ', jasmine.DEFAULT_TIMEOUT_INTERVAL);
                    console.log(deviceId + ' created');
                     // add some delay before running each test
                    setTimeout(function(){
                        done();
                    }, 500);
                });
            });

            afterEach(() => {
                return rp.delete(deviceUri).then(() => {
                    console.log(deviceId + ' deleted');
                })
            });

            it(service.displayName, () => {
                return rp.get(deviceUri).then((response) => {
                    const device = JSON.parse(response);
                    device.should.have.property('Id', deviceId);
                    device.should.have.deep.property('Tags', {
                        Building: 'Building 40',
                        deviceType: 'Simulated',
                        Floor: '1F'
                    });
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
                    console.log(deviceId + ' deleted');
                })
            });

            it(service.displayName, () => {
                let options = {
                    method: 'POST',
                    uri: service.serviceUrl + '/v1/devices',
                    body:  {
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

                return rp(options).then((device) => {
                    console.log(device);
                    device.should.have.deep.property('$metadata', {
                        '$uri': '/v1/devices/' + deviceId,
                        '$type': 'Device;1',
                        '$twin_uri': '/v1/devices/'+ deviceId + '/twin'
                    });
                    device.should.have.property('Etag');
                    device.should.have.property('Id').to.be.equal(deviceId);
                    device.should.have.property('C2DMessageCount').to.be.above(-1);
                    device.should.have.property("Connected").to.be.a('boolean');
                    device.should.have.property("Enabled").to.be.a('boolean');
                    device.should.have.deep.property('Tags', {
                        Building: 'Building 40',
                        deviceType: 'Simulated',
                        Floor: '1F'
                    });
                    device.should.have.deep.property('Properties').to.have.property('Reported', {});
                    device.should.have.deep.property('Properties').to.have.deep.property('Desired', {
                        Number: 4,
                        Config: { TemperatureMeanValue: 70.0 },
                        Compus: 'Redmond',
                        IsNew: true
                    });
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
                    console.log(deviceId + ' deleted');
                })
            });

            it(service.displayName, () => {
                let options = {
                    method: 'PUT',
                    uri: deviceUri,
                    body:  {
                        Id: deviceId,
                        Tags: {
                            Building: 'Building 40',
                            deviceType: 'Simulated',
                            Floor: '1F'
                        }
                    },
                    json: true
                };
                return rp(options).then((device) => {
                    device.should.have.deep.property('$metadata', {
                        '$uri': '/v1/devices/' + deviceId,
                        '$type': 'Device;1',
                        '$twin_uri': '/v1/devices/'+ deviceId + '/twin'
                    });
                    device.should.have.property('Etag');
                    device.should.have.property('Id').to.be.equal(deviceId);
                    device.should.have.property('C2DMessageCount').to.be.above(-1);
                    device.should.have.property("Connected").to.be.a('boolean');
                    device.should.have.property("Enabled").to.be.a('boolean');
                    device.should.have.deep.property('Tags', {
                        Building: 'Building 40',
                        deviceType: 'Simulated',
                        Floor: '1F'
                    });
                });
            });
        });
    });
});