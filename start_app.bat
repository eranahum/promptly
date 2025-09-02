@echo off
echo Starting Text Saver React App...
echo.
echo This will install dependencies and start both the backend and frontend servers.
echo.
echo Press any key to continue...
pause >nul

echo Installing dependencies...
npm install

echo.
echo Starting the application...
echo Backend server will run on port 5000
echo Frontend will run on port 3000
echo.
echo Press Ctrl+C to stop both servers
echo.

npm run dev

