@echo off
ECHO Starting Frontend and Gateway servers...

start "Backend Server" cmd /k "cd library-gate && npm start"

start "Frontend Server" cmd /k "cd library-frontend && npm start"

ECHO All servers have been started