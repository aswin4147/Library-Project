@echo off
TITLE Library Project Installer

echo Starting 'npm install' for library-frontend...
start "Frontend Install" cmd /k "cd library-frontend && npm install"

echo Starting 'npm install' for library-gate...
start "Gate Install" cmd /k "cd library-gate && npm install"

echo Both installation processes have been launched in new windows.