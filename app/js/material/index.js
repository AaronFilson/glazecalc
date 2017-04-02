module.exports = function(app) {
  require('./controllers/material_controller')(app);
  require('./directives/component_directive')(app);
  require('./directives/element_directive')(app);
};
