module.exports = function(app) {
  require('./controllers/material_controller')(app);
  require('./directives/firedox_directive')(app);
};
