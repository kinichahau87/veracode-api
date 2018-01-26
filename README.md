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
  veracode-api \\path\\to\\zip app_name scantype:[prescan,scan]
  ```

## Examples

  example prescan:

  ```
  veracode-api C:\Users\kmorfin\test "test app" prescan
  ```

  ![Alt text](prescan-request.PNG?raw=true "succesfull prescan")

  example scan:

  ```
  veracode-api C:\Users\kmorfin\test "test app" scan
  ```

  ![Alt text](scan-sent.PNG?raw=true "succesfull scan")
