[![https://nodei.co/npm/veracode-api.png?downloads=true&downloadRank=true&stars=true](https://nodei.co/npm/veracode-api.png?downloads=true&downloadRank=true&stars=true)](https://www.npmjs.com/package/veracode-api)


Veracode API Tool
=============================

used to help automate scanning applications during the development cycle

## Installation
  you can install globally to use it in the jenkins execute node script plugin


  ```
  npm install -g veracode-api
  ```  

## Usage

  ```
  veracode_api \\path\\to\\zip app_name scantype:[prescan,scan]
  ```

## Before you use

  this tool needs credentials to access the api. It uses 3 environment variables 'VERACODEUSER', 'VERACODEPSWD' and 'DEBUG'. Makesure whatever username you are using has developer access. Without the DEBUG variable set you will not see any output to standard out. Refer to the node [debug module](https://www.npmjs.com/package/debug) for setting this environment variable.

## Examples

  example prescan:

  ```
  veracode_api C:\Users\kmorfin\test "test app" prescan
  ```

  ![Alt text](prescan-request.PNG?raw=true "succesfull prescan")

  example scan:

  ```
  veracode_api C:\Users\kmorfin\test "test app" scan
  ```

  ![Alt text](scan-sent.PNG?raw=true "succesfull scan")
