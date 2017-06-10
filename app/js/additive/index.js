module.exports = function(app) {
  require('./controllers/additive_controller')(app);
  require('./directives/component_directive')(app);
  require('./directives/element_directive')(app);
};
