API Test Suites
================
Command Line Interface for running API tests against deployed IoT preconfigured solution in order to validate the microservices are exposing compliant API specification.

How To Use
===========
Currently this tool requires to enable `--unsafe` mode for solution deployment to bypass authentication token. In the future the authentication token will be acquired before running the tests.

## Steps
1. Checkout the code from `api_test` branch
```
git fetch
git checkout api_test
```

2. Rebuild the pcs-cli command
```
npm start
```

3. Link the `pcs` command again
```
npm link
```

4. Login in and deploy your solution
```
pcs login -e AzureCloud
pcs -t basic -r dotnet
```

5.	Running `apitest` script
```
npm run apitest
```

You can also use the generated file `testsuites-config.json` previously and skip the menu to run test directly.
```
jest testsuites
```

6. Two options available here

* Option 1

    Choose the deployment just completed from list and enter. It will show reports of all api test against the deployed services. all results will be output a timestamped folder under `./report` directory each round.
    * summary.log
    * Any error will be logged into files for each service with suffix `.err`.

* Option 2

    You can also select the last option to input target service uri which will be used to replace placeholder in [testsuites-config-template.json](./testsuites-config-template.json) and generate `testsuites-config.json` file.
