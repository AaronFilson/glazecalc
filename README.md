# glazecalc
Glaze calculation software to assist potters and ceramicists.

This software package is under development at present. It aims to enable the formulation of glazes on a device of your choice, such as a PC web browser, an iPhone or Android device, and other platforms. It is open sourced under the MIT license, which is available for viewing under LICENSE.

For local install of the Glaze Calc, you will need Node 22.22 or 24.15 or newer (tested on
Node 24 LTS), npm, and MongoDB 7.0. Clone the
repository to your machine, and create a directory 'db' alongside (at the same level) as the
server and client directories. Run the command 'npm install' on your favorite terminal (in the root
directory of the project, which contains the package.json file).

The client is an Angular 22 app in 'client/'. 'npm run build' builds it into 'dist/glazecalc/browser',
and 'npx ng serve' runs it on port 3000 with live reload while you work on it. The API server
and the glaze chemistry ('lib/chemistry', shared by the client and server) are plain Node.

With mongod running, 'npm test' runs the server and chemistry tests and 'npm run test:client' runs
the client unit tests; 'npm run test:coverage' and 'npm run test:client:coverage' add coverage
reports. If there are any failures on the tests, it may be there was a problem with the install
or an unexpected version issue. The 'npm start' script uses '&' to run the API and client servers
at once, so on Windows run it from Git Bash or WSL.

Browser tests use Playwright. Install the browser once with 'npx playwright install chromium',
start mongod, make sure nothing else is using port 4000, and run 'npm run test:e2e'. The tests
build the app, start both servers, and use their own 'glazecalc_e2e' database, which they reset
and fill with the standard materials each run. 'npx playwright show-report' opens the results.

The standard materials and additives are loaded with mongoimport (part of the MongoDB
Database Tools). Upsert mode refreshes them without touching users' own entries:

    mongoimport --db glazecalc_app_dev --collection materials --mode upsert --file materials.json
    mongoimport --db glazecalc_app_dev --collection additives --mode upsert --file additives.json

Once installed, use 'npm start' on the terminal to start the server and client.
The app is served on port 3000 of the localhost (set CLIENTPORT to change it), and it
calls the API server on port 4000 of the same host. When hosting on a domain, set
HOSTURL (for example 'http://glazecalcapp.com:') so the API accepts requests from the app.

Create a user account to store the recipes and materials. If there is any chance
the app will be exposed to multiple users or the internet, set the environment
variable APP_SECRET on the terminal to your secret phrase or hex value. Changing
 the APP_SECRET will invalidate tokens saved by users, which is useful in some cases.

There is no size limit imposed on users of the Glaze Calc app, so if you host it
on the internet, you may want to extend this package to do so.
