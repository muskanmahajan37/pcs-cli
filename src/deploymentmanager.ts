import * as chalk from 'chalk';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as fetch from 'node-fetch';

import { ResourceManagementClient, ResourceModels } from 'azure-arm-resource';
import { AzureEnvironment, DeviceTokenCredentials, DeviceTokenCredentialsOptions } from 'ms-rest-azure';
import { Answers, Question } from 'inquirer';
import DeployUI from './deployui';
import { Client, ConnectConfig, SFTPWrapper } from 'ssh2';
import { IK8sManager, K8sManager } from './k8smanager';
import { Config } from './config';

type ResourceGroup = ResourceModels.ResourceGroup;
type Deployment = ResourceModels.Deployment;
type DeploymentProperties = ResourceModels.DeploymentProperties;
type DeploymentExtended = ResourceModels.DeploymentExtended;
type DeploymentOperationsListResult = ResourceModels.DeploymentOperationsListResult;
type DeploymentOperation = ResourceModels.DeploymentOperation;
type DeploymentValidateResult = ResourceModels.DeploymentValidateResult;

const MAX_RETRY = 36;
const KUBEDIR = os.homedir() + path.sep + '.kube';
// We are using BingMap APIs with plan = internal1
// It only allows to have 2 apis per subscription
const MAX_BING_MAP_APIS_FOR_INTERNAL1_PLAN = 2;

export interface IDeploymentManager {
    submit(answers: Answers | undefined): Promise<any>;
    getLocations(): Promise<string[]>;
}

export class DeploymentManager implements IDeploymentManager {
    private _options: DeviceTokenCredentialsOptions;
    private _solutionType: string;
    private _sku: string;
    private _template: any;
    private _parameters: any;
    private _subscriptionId: string;
    private _client: ResourceManagementClient;

    constructor(options: DeviceTokenCredentialsOptions, subscriptionId: string, solutionType: string, sku: string) {
        this._options = options;
        this._solutionType = solutionType;
        this._sku = sku;
        this._subscriptionId = subscriptionId;
        const baseUri = this._options.environment ? this._options.environment.resourceManagerEndpointUrl : undefined;
        this._client = new ResourceManagementClient(new DeviceTokenCredentials(this._options), subscriptionId, baseUri);
    }

    public getLocations(): Promise<string[]> {
        // Currently IotHub is not supported in all the regions so using it to get the available locations
        return this._client.providers.get('Microsoft.Devices')
        .then((providers: ResourceModels.Provider) => {
            if (providers.resourceTypes) {
                const resourceType = providers.resourceTypes.filter((x) => x.resourceType && x.resourceType.toLowerCase() === 'iothubs');
                if (resourceType && resourceType.length) {
                    return resourceType[0].locations || [];
                }
            }
            return [];
        });
    }

    public submit(answers: Answers): Promise<any> {
        if (!!!answers || !!!answers.solutionName || !!!answers.subscriptionId || !!!answers.location) {
            return Promise.reject('Solution name, subscription id and location cannot be empty');
        }

        const location = answers.location;
        const deployment: Deployment = { properties: {
            mode: 'Incremental',
        }};
        const deployUI = DeployUI.instance;
        const deploymentName = 'deployment-' + answers.solutionName;
        let deploymentProperties: any = null;
        let resourceGroupUrl: string;
        let freeBingMapResourceCount: number = 0;
        let resourceGroup: ResourceGroup = {
            location,
            // TODO: Explore if it makes sense to add more tags, e.g. Language(Java/.Net), version etc
            tags: { IotSolutionType: this._solutionType },
        };
        const parametersFileName = this._sku + '-parameters.json';
        const environment = this._options.environment;
        let portalUrl = 'https://portal.azure.com';
        let storageEndpointSuffix: string;
        let azureVMFQDNSuffix: string;
        let activeDirectoryEndpointUrl: string;

        return this._client.resources.list({filter: 'resourceType eq \'Microsoft.BingMaps/mapApis\''})
        .then((resources: ResourceModels.ResourceListResult) => {
            // using static map for China environment by default since Bing Map resource is not available.
            if (this._options.environment && this._options.environment.name === AzureEnvironment.AzureChina.name) {
                this._sku += '-static-map';
            } else {
                resources.forEach((resource: ResourceModels.GenericResource) => {
                    if (resource.plan && resource.plan.name && resource.plan.name.toLowerCase() === 'internal1') {
                        freeBingMapResourceCount++;
                    }
                });
                if (freeBingMapResourceCount >= MAX_BING_MAP_APIS_FOR_INTERNAL1_PLAN) {
                    this._sku += '-static-map';
                }
            }
            const solutionFileName = this._sku + '.json';
            try {
                const armTemplatePath = __dirname + path.sep + this._solutionType + path.sep + 'armtemplates' + path.sep;
                this._template = require(armTemplatePath + solutionFileName);
                this._parameters = require(armTemplatePath + parametersFileName);
                // Change the default suffix for basic sku based on current environment
                if (environment) {
                    switch (environment.name) {
                        case AzureEnvironment.AzureChina.name:
                            azureVMFQDNSuffix = 'cloudapp.chinacloudapi.cn';
                            break;
                        case AzureEnvironment.AzureGermanCloud.name:
                            azureVMFQDNSuffix = 'cloudapp.azure.de';
                            break;
                        case AzureEnvironment.AzureUSGovernment.name:
                            azureVMFQDNSuffix = 'cloudapp.azure.us';
                            break;
                        default:
                            // use default parameter values of global azure environment
                            azureVMFQDNSuffix = 'cloudapp.azure.com';
                    }
                    storageEndpointSuffix = environment.storageEndpointSuffix;
                    activeDirectoryEndpointUrl = environment.activeDirectoryEndpointUrl;
                    if (storageEndpointSuffix.startsWith('.')) {
                        storageEndpointSuffix = storageEndpointSuffix.substring(1);
                    }
                    if (answers.deploymentSku === 'basic') {
                        this._parameters.storageEndpointSuffix =  { value: storageEndpointSuffix };
                        this._parameters.vmFQDNSuffix = { value: azureVMFQDNSuffix };
                        this._parameters.aadInstance = { value: activeDirectoryEndpointUrl };
                    }
                }
                this.setupParameters(answers);
            } catch (ex) {
                throw new Error('Could not find template or parameters file: ' + ex.name + ': ' + ex.message);
            }
            deployment.properties.parameters = this._parameters;
            deployment.properties.template = this._template;
            return deployment;
        })
        .then((properties: Deployment) => {
            deployUI.start('Creating resource group');
            return this._client.resourceGroups.createOrUpdate(answers.solutionName, resourceGroup);
        })
        .then((result: ResourceGroup) => {
            resourceGroup = result;
            if (environment && environment.portalUrl) {
                portalUrl = environment.portalUrl;
            }
            resourceGroupUrl = `${portalUrl}/${answers.domainName}#resource${resourceGroup.id}`;
            deployUI.stop({message: `Created resource group: ${chalk.cyan(resourceGroupUrl)}`});
            deployUI.start('Running validation before deploying resources');
            return this._client.deployments.validate(answers.solutionName, deploymentName, deployment);
        })
        .then((validationResult: DeploymentValidateResult) => {
            if (validationResult.error) {
                const status = {
                    err: 'Deployment validation failed:\n' + JSON.stringify(validationResult.error, null, 2)
                };
                deployUI.stop(status);
                throw new Error(JSON.stringify(validationResult.error));
            }
            const options = {
                client: this._client,
                deploymentName,
                resourceGroupName: answers.solutionName,
                totalResources: deployment.properties.template.resources.length as number
            };
            deployUI.start('', options);
            return this._client.deployments.createOrUpdate(answers.solutionName as string, deploymentName, deployment);
        })
        .then((res: DeploymentExtended) => {
            deployUI.stop();
            deploymentProperties = res.properties;

            if (answers.deploymentSku === 'standard') {
                deployUI.start(`Downloading credentials to setup Kubernetes from: ${chalk.cyan(deploymentProperties.outputs.masterFQDN.value)}`);
                return this.downloadKubeConfig(deploymentProperties.outputs, answers.sshFilePath);
            }
            return Promise.resolve('');
        })
        .then((kubeConfigPath: string) => {
            if (answers.deploymentSku === 'standard') {
                deployUI.stop({message: `Credentials downloaded to config: ${chalk.cyan(kubeConfigPath)}`});
                const outputs = deploymentProperties.outputs;
                const config = new Config();
                config.AADTenantId = answers.aadTenantId;
                config.AADLoginURL = activeDirectoryEndpointUrl;
                config.ApplicationId = answers.appId;
                config.AzureStorageAccountKey = outputs.storageAccountKey.value;
                config.AzureStorageAccountName = outputs.storageAccountName.value;
                config.AzureStorageEndpointSuffix = storageEndpointSuffix;
                // If we are under the plan limi then we should have received a query key
                if (freeBingMapResourceCount < MAX_BING_MAP_APIS_FOR_INTERNAL1_PLAN) {
                    config.BingMapApiQueryKey = outputs.mapApiQueryKey.value;
                }
                config.DNS = outputs.agentFQDN.value;
                config.DocumentDBConnectionString = outputs.documentDBConnectionString.value;
                config.EventHubEndpoint = outputs.eventHubEndpoint.value;
                config.EventHubName = outputs.eventHubName.value;
                config.EventHubPartitions = outputs.eventHubPartitions.value.toString();
                config.IoTHubConnectionString = outputs.iotHubConnectionString.value;
                config.LoadBalancerIP = outputs.loadBalancerIp.value;
                config.Runtime = answers.runtime;
                config.TLS = answers.certData;
                const k8sMananger: IK8sManager = new K8sManager('default', kubeConfigPath, config);
                deployUI.start('Setting up Kubernetes');
                return k8sMananger.setupAll();
            }
            return Promise.resolve();
        })
        .then(() => {
            const webUrl = deploymentProperties.outputs.azureWebsite.value;
            deployUI.start(`Waiting for ${chalk.cyan(webUrl)} to be ready, this could take up to 5 minutes`);
            return this.waitForWebsiteToBeReady(webUrl);
        })
        .then((done: boolean) => {
            const directoryPath = process.cwd() + path.sep + 'deployments';
            if (!fs.existsSync(directoryPath)) {
                fs.mkdirSync(directoryPath);
            }
            const fileName: string = directoryPath + path.sep + deploymentName + '-output.json';
            const troubleshootingGuide = 'https://aka.ms/iot-rm-tsg';

            if (deploymentProperties.outputs.azureWebsite) {
                const webUrl = deploymentProperties.outputs.azureWebsite.value;
                const status = {
                    message: `Solution: ${chalk.cyan(answers.solutionName)} is deployed at ${chalk.cyan(webUrl)}`
                };
                if (!done) {
                    status.message += `\n${chalk.yellow('Website not yet available, please refer to troubleshooting guide here:')}\n` +
                    `${chalk.cyan(troubleshootingGuide)}`;
                }
                deployUI.stop(status);
                const output = {
                    aadAppUrl: answers.aadAppUrl,
                    resourceGroupUrl,
                    troubleshootingGuide,
                    website: deploymentProperties.outputs.azureWebsite.value,
                };
                fs.writeFileSync(fileName, JSON.stringify(output, null, 2));
                console.log('Output saved to file: %s', `${chalk.cyan(fileName)}`);
                return Promise.resolve();
            } else {
                return Promise.reject('Azure website url not found in deployment output');
            }
        })
        .catch((error: Error) => {
            let err = error.toString();
            if (err.includes('Entry not found in cache.')) {
                err = 'Session expired, Please run pcs login again. \n\
                Resources are being deployed at ' + resourceGroupUrl;
            }
            deployUI.stop({err});
        });
    }

    private downloadKubeConfig(outputs: any, sshFilePath: string): Promise<string> {
        if (!fs.existsSync(KUBEDIR)) {
            fs.mkdirSync(KUBEDIR);
        }
        const localKubeConfigPath: string = KUBEDIR + path.sep + 'config' + '-' + outputs.containerServiceName.value;
        const remoteKubeConfig: string = '.kube/config';
        const sshDir = sshFilePath.substring(0, sshFilePath.lastIndexOf(path.sep));
        const sshPrivateKeyPath: string = sshDir + path.sep + 'id_rsa';
        const pk: string = fs.readFileSync(sshPrivateKeyPath, 'UTF-8');
        const sshClient = new Client();
        const config: ConnectConfig = {
            host: outputs.masterFQDN.value,
            port: 22,
            privateKey: pk,
            username: outputs.adminUsername.value
        };
        return new Promise<any>((resolve, reject) => {
            let retryCount = 0;
            const timer = setInterval(
                () => {
                    // First remove all listeteners so that we don't have duplicates
                    sshClient.removeAllListeners();

                    sshClient
                    .on('ready', (message: any) => {
                        sshClient.sftp( (error: Error, sftp: SFTPWrapper) => {
                            if (error) {
                                sshClient.end();
                                reject(error);
                                clearInterval(timer); 
                                return;
                            }
                            sftp.fastGet(remoteKubeConfig, localKubeConfigPath, (err: Error) => {
                                sshClient.end();
                                clearInterval(timer);
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                resolve(localKubeConfigPath);
                            });
                        });
                    })
                    .on('error', (err: Error) => {
                        if (retryCount++ > MAX_RETRY) {
                            clearInterval(timer);
                            reject(err);
                        }
                    })
                    .on('timeout', () => {
                        if (retryCount++ > MAX_RETRY) {
                            clearInterval(timer);
                            reject(new Error('Failed after maximum number of tries'));
                        }
                    })
                    .connect(config);
                },
                5000);
        });
    }

    private setupParameters(answers: Answers) {
        this._parameters.solutionName.value = answers.solutionName;
        // Temporary check, in future both types of deployment will always have username and passord
        // If the parameters file has adminUsername section then add the value that was passed in by user
        if (this._parameters.adminUsername) {
            this._parameters.adminUsername.value = answers.adminUsername;
        }
        // If the parameters file has adminPassword section then add the value that was passed in by user
        if (this._parameters.adminPassword) {
            this._parameters.adminPassword.value = answers.adminPassword;
        }
        if (this._parameters.servicePrincipalSecret) {
            this._parameters.servicePrincipalSecret.value = answers.servicePrincipalSecret;
        }
        if (this._parameters.servicePrincipalClientId) {
            this._parameters.servicePrincipalClientId.value = answers.appId;
        }
        if (this._parameters.sshRSAPublicKey) {
            this._parameters.sshRSAPublicKey.value = fs.readFileSync(answers.sshFilePath, 'UTF-8');
        }
        if (this._parameters.azureWebsiteName) {
            this._parameters.azureWebsiteName.value = answers.azureWebsiteName;
        }
        if (this._parameters.remoteEndpointSSLThumbprint) {
            this._parameters.remoteEndpointSSLThumbprint.value = answers.certData.fingerPrint;
        }
        if (this._parameters.remoteEndpointCertificate) {
            this._parameters.remoteEndpointCertificate.value = answers.certData.cert;
        }
        if (this._parameters.remoteEndpointCertificateKey) {
            this._parameters.remoteEndpointCertificateKey.value = answers.certData.key;
        }
        if (this._parameters.aadTenantId) {
            this._parameters.aadTenantId.value = answers.aadTenantId;
        }
        if (this._parameters.aadClientId) {
            this._parameters.aadClientId.value = answers.appId;
        }
        if (this._parameters.microServiceRuntime) {
            this._parameters.microServiceRuntime.value = answers.runtime;
        }
    }

    private  waitForWebsiteToBeReady(url: string): Promise<boolean> {
        const status: string = url + '/ssl-proxy-status';
        const req = new fetch.Request(status, { method: 'GET' });
        let retryCount = 0;
        return new Promise((resolve, reject) => {
            const timer = setInterval(
                () => {
                    fetch.default(req)
                    .then((value: fetch.Response) => {
                        return value.json();
                    })
                    .then((body: any) => {
                        if (body.Status.includes('Alive') || retryCount > MAX_RETRY) {
                            clearInterval(timer);
                            if (retryCount > MAX_RETRY) {
                                resolve(false);
                            } else {
                                resolve(true);
                            }
                        }
                    })
                    .catch((error: any) => {
                        // Continue
                        if (retryCount > MAX_RETRY) {
                            clearInterval(timer);
                            resolve(false);
                        }
                    });
                    retryCount++;
                },
                10000);
        });
    }
}

export default DeploymentManager;