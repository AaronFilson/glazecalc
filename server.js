var PORT = process.env.PORT || 4000;
var clientPort = process.env.CLIENTPORT || 4001;
var hostURL = process.env.HOSTURL || 'http://localhost:';
const express = require('express');

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGOLAB_URI || 'mongodb://127.0.0.1/glazecalc_app_dev', {})
  .catch(error => {
    console.log('error ' + error);
     throw error;
  });

const app = module.exports = exports = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', hostURL + clientPort);
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, token');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  next();
});

const additivesRouter = require(__dirname + '/server/routes/additives_routes');
const adviceRouter = require(__dirname + '/server/routes/advice_routes');
const authRouter = require(__dirname + '/server/routes/auth_routes');
const firingRouter = require(__dirname + '/server/routes/firing_routes');
const materialsRouter = require(__dirname + '/server/routes/materials_routes');
const notesRouter = require(__dirname + '/server/routes/notes_routes');
const recipeRouter = require(__dirname + '/server/routes/recipe_routes');
const trashRouter = require(__dirname + '/server/routes/trash_routes');
const userRouter = require(__dirname + '/server/routes/user_routes');

app.use('/additives', additivesRouter);
app.use('/advice', adviceRouter);
app.use('/', authRouter);
app.use('/firing', firingRouter);
app.use('/materials', materialsRouter);
app.use('/notes', notesRouter);
app.use('/recipe', recipeRouter);
app.use('/trash', trashRouter);
app.use('/', userRouter);

console.log('hostURL is : ' + hostURL + ', and clientPort is : ' + clientPort);
app.listen(PORT, () => console.log('Glazecalc backend server up on port: ' + PORT));
