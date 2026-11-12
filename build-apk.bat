@echo off
set "JAVA_HOME=%~dp0jdk21\jdk-21.0.12.1+1"
set "ANDROID_HOME=C:\Users\PC\AppData\Local\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "%~dp0android"
echo Building Android Debug APK with Gradle...
call gradlew.bat assembleDebug
