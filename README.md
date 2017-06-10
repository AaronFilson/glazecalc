# glazecalc
Glaze calculation software to assist potters and ceramicists.

This software package is under development at present. It aims to enable the formulation of glazes on a device of your choice, such as a PC web browser, an iPhone, and other platforms. It is open sourced under the MIT license, which is available for viewing under LICENSE.

For local install of the Glaze Calc, you will need Node, npm, and Mongo. Clone the
repository to your machine, and create a directory 'db' alongside (at the same level) as the
server and app directories. Run the command 'npm install' on your favorite terminal (in the root
directory of the project, which contains the package.json file). Then run the command 'gulp'.
After the install, try the command 'npm test', which should run a series of basic tests on
the project. If there are any failures on the tests, it may be there was a problem
with the install or an unexpected version issue.

Once installed, use 'npm start' on the terminal to start the server and client.
The app is programmed to use port 4001 on the localhost (generally 127.0.0.1 if
you prefer IPv4 addresses).

Create a user account to store the recipes and materials. If there is any chance
the app will be exposed to multiple users or the internet, set the environment
variable APP_SECRET on the terminal to your secret phrase or hex value. Changing
 the APP_SECRET will invalidate tokens saved by users, which is useful in some cases.

There is no size limit imposed on users of the Glaze Calc app, so if you host it
on the internet, you may want to extend this package to do so.

Phase two planning is started, so please use Github's Issues or Pull Requests to
send in your ideas. Enjoy!

-Aaron
