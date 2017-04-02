module.exports = function(app) {
  app.directive('componentSelect', function() {
    return {
      restrict: 'EA',
      templateUrl: '/templates/material/directives/component_dir_template.html'
    };
  });
};
