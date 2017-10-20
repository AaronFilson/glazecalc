module.exports = function(app) {
  require('./services/reset_service')(app);
  require('./controllers/reset_controller')(app);
  // require('./directives/reset_directive')(app);
};
