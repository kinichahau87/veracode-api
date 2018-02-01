@ECHO OFF

npm run dev C:\Apache24\htdocs\monitoring-center-2.0\deploy\ "test app" prescan | FIND "ERROR"
IF NOT ERRORLEVEL 1 GOTO ERROR

:ERROR
EXIT /B -1
