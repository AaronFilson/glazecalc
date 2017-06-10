module.exports = function(app) {
  require('./controllers/firing_controller')(app);
  require('./directives/field_directive.js')(app);
};
