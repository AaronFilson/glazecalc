module.exports = function(app) {
  app.directive('componentSelect', function() {
    return {
      restrict: 'EA',
      templateUrl: '/templates/additive/directives/component_dir_template.html'
    };
  });
};
